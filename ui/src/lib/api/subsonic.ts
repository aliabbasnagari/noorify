import { config } from "@/lib/config"
import { handleUnauthorized } from "@/lib/api/http"
import { useAuthStore } from "@/stores/auth-store"
import type {
  Album,
  Artist,
  Song,
  SubsonicSearchAlbum,
  SubsonicSearchArtist,
  SubsonicSearchSong,
  SubsonicSimilarArtist,
  SubsonicStructuredLyric,
  SubsonicTopSong,
} from "@/lib/api/types"
import type { ScanStatus } from "@/stores/scan-status-store"

const CLIENT_NAME = "NavidromeWebUI"
const API_VERSION = "1.16.1"

/**
 * The Subsonic surface (`/rest/*`) isn't just for third-party clients —
 * cover art, streaming, scrobbling, and metadata enrichment all go through
 * it (native REST has no equivalents). See old-ui/src/subsonic/index.js.
 */
function subsonicParams(extra: Record<string, string | number> = {}) {
  const session = useAuthStore.getState().session
  const params = new URLSearchParams({
    u: session?.username ?? "",
    t: session?.subsonicToken ?? "",
    s: session?.subsonicSalt ?? "",
    v: API_VERSION,
    c: CLIENT_NAME,
    f: "json",
  })
  for (const [key, value] of Object.entries(extra)) {
    params.set(key, String(value))
  }
  return params
}

export function subsonicUrl(
  endpoint: string,
  extra: Record<string, string | number> = {},
): string {
  return `${config.baseURL}/rest/${endpoint}?${subsonicParams(extra)}`
}

export type CoverArtEntityPrefix = "mf" | "al" | "pl" | "ra" | "ar"

export function getCoverArtUrl(
  entityId: string,
  prefix: CoverArtEntityPrefix,
  size = config.uiCoverArtSize,
): string {
  return subsonicUrl("getCoverArt", { id: `${prefix}-${entityId}`, size })
}

// Subsonic error codes 40-44 are all authentication failures (wrong
// credentials, token auth unsupported, etc.) — they come back as HTTP 200.
const SUBSONIC_AUTH_ERROR_CODES = new Set([40, 41, 42, 43, 44])

export class SubsonicError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = "SubsonicError"
    this.code = code
  }
}

/**
 * Every Subsonic call — reads and writes alike — goes through here so that
 * HTTP failures, non-JSON bodies (e.g. a proxy error page) and Subsonic's
 * own `status: "failed"` envelope all surface as thrown errors, and so a
 * stale Subsonic token signs the user out instead of silently breaking
 * covers/streams/lyrics.
 */
export async function subsonicFetch<T>(
  endpoint: string,
  extra: Record<string, string | number> = {},
): Promise<T> {
  const response = await fetch(subsonicUrl(endpoint, extra))
  // `ok` is checked against `false` explicitly rather than falsiness.
  if (response.ok === false) {
    if (response.status === 401) handleUnauthorized()
    throw new SubsonicError(
      `Subsonic ${endpoint} failed (HTTP ${response.status})`,
    )
  }
  let payload: { "subsonic-response"?: SubsonicEnvelope }
  try {
    payload = await response.json()
  } catch {
    throw new SubsonicError(`Subsonic ${endpoint} returned an invalid response`)
  }
  const root = payload["subsonic-response"]
  if (!root) {
    throw new SubsonicError(`Subsonic ${endpoint} returned an invalid response`)
  }
  if (root.status !== "ok") {
    if (root.error?.code !== undefined && SUBSONIC_AUTH_ERROR_CODES.has(root.error.code)) {
      handleUnauthorized()
    }
    throw new SubsonicError(
      root.error?.message ?? `Subsonic error calling ${endpoint}`,
      root.error?.code,
    )
  }
  return root as T
}

interface SubsonicEnvelope {
  status: string
  error?: { code?: number; message?: string }
}

/** Streamable audio URL for a song id — unlike getCoverArt, stream/download/
 * scrobble take the song's own (unprefixed) id. */
export function streamUrl(songId: string): string {
  return subsonicUrl("stream", { id: songId })
}

export function downloadUrl(songId: string): string {
  return subsonicUrl("download", { id: songId })
}

/** `submission=false` pings "now playing"; `submission=true` records a
 * scrobble. See server/subsonic/scrobble.go. */
export function reportPlayback(songId: string, submission: boolean) {
  return subsonicFetch("scrobble", {
    id: songId,
    submission: String(submission),
  })
}

/** Native REST already annotates `starred`/`rating` on album/artist/song
 * resources (same DB columns the sort/filter vocabulary reads), so reads
 * never need these — only the write side goes through Subsonic. */
export function star(id: string) {
  return subsonicFetch("star", { id })
}

export function unstar(id: string) {
  return subsonicFetch("unstar", { id })
}

/** `rating` is 0-5; 0 removes the rating. */
export function setRating(id: string, rating: number) {
  return subsonicFetch("setRating", { id, rating })
}

/**
 * Biography/similar-artists come only from configured external metadata
 * agents (last.fm/spotify/etc.) — with none configured this still returns
 * a normal 200 with empty fields, never an error, so callers should just
 * check for an empty/missing biography or similarArtist array.
 * Similar-artist entries with `id: "-1"` aren't in the local library (no
 * local artist page to link to).
 */
export async function getArtistInfo(artistId: string) {
  const root = await subsonicFetch<{
    artistInfo2: {
      biography?: string
      similarArtist?: SubsonicSimilarArtist[]
    }
  }>("getArtistInfo2", { id: artistId, count: 8 })
  return root.artistInfo2
}

/** Falls back to locally starred/rated tracks by this artist when no
 * external agent is configured — still a normal 200 with `song: []` if
 * nothing qualifies, never an error. */
export async function getTopSongs(artistName: string, count = 5) {
  const root = await subsonicFetch<{ topSongs: { song?: SubsonicTopSong[] } }>(
    "getTopSongs",
    { artist: artistName, count },
  )
  return root.topSongs.song ?? []
}

function searchArtistToArtist(a: SubsonicSearchArtist): Artist {
  return {
    id: a.id,
    name: a.name,
    albumCount: a.albumCount,
    starred: !!a.starred,
    rating: a.userRating ?? 0,
  }
}

function searchAlbumToAlbum(a: SubsonicSearchAlbum): Album {
  return {
    id: a.id,
    name: a.name,
    albumArtist: a.artist ?? "",
    albumArtistId: a.artistId ?? "",
    songCount: a.songCount,
    duration: a.duration,
    maxYear: a.year,
    starred: !!a.starred,
    rating: a.userRating ?? 0,
  }
}

function searchSongToSong(s: SubsonicSearchSong): Song {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist ?? "",
    artistId: s.artistId ?? "",
    albumId: s.albumId ?? "",
    album: s.album ?? "",
    duration: s.duration ?? 0,
    trackNumber: s.track,
    discNumber: s.discNumber,
    starred: !!s.starred,
    rating: s.userRating ?? 0,
  }
}

/**
 * Global instant search — old-ui has no equivalent, this is genuinely new
 * UI over an existing backend capability. `search3` is ID3-based (returns
 * artist/album/song, not folder-based results) and ignores an empty query
 * by returning arbitrary results, so callers must not invoke this with a
 * blank/whitespace-only query. Playlists aren't covered by any Subsonic
 * search endpoint — callers needing those should query native REST's
 * `playlist` resource with a `q` filter instead (substring match against
 * name/comment — see persistence/playlist_repository.go's playlistFilter).
 */
export async function search3(
  query: string,
  counts: { artistCount?: number; albumCount?: number; songCount?: number } = {},
) {
  const root = await subsonicFetch<{
    searchResult3: {
      artist?: SubsonicSearchArtist[]
      album?: SubsonicSearchAlbum[]
      song?: SubsonicSearchSong[]
    }
  }>("search3", {
    query,
    artistCount: counts.artistCount ?? 8,
    albumCount: counts.albumCount ?? 8,
    songCount: counts.songCount ?? 20,
  })
  const result = root.searchResult3
  return {
    artists: (result.artist ?? []).map(searchArtistToArtist),
    albums: (result.album ?? []).map(searchAlbumToAlbum),
    songs: (result.song ?? []).map(searchSongToSong),
  }
}

/** Prefers a synced, primary-language lyric ("main" or unlabeled `kind`,
 * per model/lyrics.go's Kind constants) over translations/pronunciations or
 * an unsynced fallback — falls back to the first entry, then null. */
function pickBestLyric(
  entries: SubsonicStructuredLyric[],
): SubsonicStructuredLyric | null {
  if (entries.length === 0) return null
  const isMain = (e: SubsonicStructuredLyric) => !e.kind || e.kind === "main"
  return (
    entries.find((e) => e.synced && isMain(e)) ??
    entries.find(isMain) ??
    entries[0]
  )
}

/** No old-ui precedent for this — it never rendered lyrics despite
 * exposing a (non-functional) toggle for them. `enhanced` opts into
 * translation/pronunciation/multi-agent cue data this app doesn't use yet,
 * so it's left off. A song with no lyrics from any configured agent still
 * returns a normal 200 with an empty list, never an error. */
export async function getLyricsBySongId(songId: string) {
  const root = await subsonicFetch<{
    lyricsList: { structuredLyrics?: SubsonicStructuredLyric[] }
  }>("getLyricsBySongId", { id: songId })
  return pickBestLyric(root.lyricsList.structuredLyrics ?? [])
}

/** Admin-only (`server/subsonic/library_scanning.go`'s `adminOnly`
 * middleware). `target` is `"<libraryID>:"` (a bare library id followed by
 * a colon, empty folder path) to scan a whole library — not part of the
 * native REST `/api/library` CRUD contract, this is the only way to
 * trigger a scan from the UI. */
export function startScan(libraryId: number, fullScan: boolean) {
  return subsonicFetch("startScan", {
    fullScan: String(fullScan),
    target: `${libraryId}:`,
  })
}

/** A global (all-libraries) scan — omits `target` entirely, which scans
 * everything rather than one library (old-ui's header scan widget, not the
 * per-library button on the Libraries admin page). */
export function startFullLibraryScan(fullScan: boolean) {
  return subsonicFetch("startScan", { fullScan: String(fullScan) })
}

/** Seeds scan status on page load/reconnect — the SSE `scanStatus` event
 * only fires on state *changes*, so a hard reload mid-scan would otherwise
 * show a stale "idle" state until the next progress tick. */
export async function getScanStatus() {
  const root = await subsonicFetch<{ scanStatus: ScanStatus }>("getScanStatus")
  return root.scanStatus
}
