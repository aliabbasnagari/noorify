/**
 * Subsonic API client
 *
 * Navidrome exposes the full Subsonic/OpenSubsonic REST API at /rest/*.
 * Auth uses: u=username, t=md5(password+salt), s=salt, f=json, v=1.8.0, c=<client>
 * Credentials come from localStorage after JWT login (the server computes the subsonic token).
 */

import { CLIENT_ID_HEADER, CLIENT_ID } from './api'

const CLIENT_NAME = 'NavidromeUI'
const API_VERSION = '1.16.1'

// ─── URL builder ─────────────────────────────────────────────────────────────

function subsonicUrl(
  command: string,
  id?: string | null,
  extra?: Record<string, string | number | boolean | string[]>,
): string {
  const username = localStorage.getItem('nd:username') ?? ''
  const token = localStorage.getItem('nd:subsonicToken') ?? ''
  const salt = localStorage.getItem('nd:subsonicSalt') ?? ''

  const params = new URLSearchParams({
    u: username,
    t: token,
    s: salt,
    f: 'json',
    v: API_VERSION,
    c: CLIENT_NAME,
  })

  if (id) params.append('id', id)

  if (extra) {
    Object.entries(extra).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => params.append(k, String(item)))
      } else {
        params.append(k, String(v))
      }
    })
  }

  return `/rest/${command}?${params.toString()}`
}

// ─── HTTP fetch ───────────────────────────────────────────────────────────────

export class SubsonicError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'SubsonicError'
    this.code = code
  }
}

async function subsonicFetch<T>(
  command: string,
  id?: string | null,
  extra?: Record<string, string | number | boolean | string[]>,
): Promise<T> {
  const url = subsonicUrl(command, id, extra)
  const res = await fetch(url, {
    headers: { [CLIENT_ID_HEADER]: CLIENT_ID },
  })

  if (!res.ok) {
    throw new SubsonicError(res.status, res.statusText)
  }

  const data = await res.json()
  const resp = data['subsonic-response']

  if (resp.status === 'failed') {
    throw new SubsonicError(resp.error?.code ?? 0, resp.error?.message ?? 'Subsonic error')
  }

  return resp as T
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubsonicArtist {
  id: string
  name: string
  albumCount: number
  coverArt?: string
  artistImageUrl?: string
}

export interface SubsonicAlbum {
  id: string
  name: string
  artist: string
  artistId: string
  coverArt?: string
  songCount: number
  duration: number
  year?: number
  genre?: string
  playCount?: number
  starred?: string
  comment?: string
  musicBrainzId?: string
}

export interface SubsonicSong {
  id: string
  title: string
  album: string
  albumId: string
  artist: string
  artistId: string
  track?: number
  year?: number
  genre?: string
  coverArt?: string
  size: number
  contentType: string
  suffix: string
  duration: number
  bitRate?: number
  path: string
  playCount?: number
  starred?: string
  userRating?: number
}

export interface SubsonicPlaylist {
  id: string
  name: string
  comment?: string
  owner: string
  songCount: number
  duration: number
  coverArt?: string
  public: boolean
  created: string
  changed: string
}

export interface SubsonicPlaylistWithSongs extends SubsonicPlaylist {
  entry: SubsonicSong[]
}

export interface SubsonicArtistInfo {
  biography?: string
  musicBrainzId?: string
  lastFmUrl?: string
  smallImageUrl?: string
  mediumImageUrl?: string
  largeImageUrl?: string
  similarArtist?: SubsonicArtist[]
}

export interface SubsonicAlbumWithSongs extends SubsonicAlbum {
  song: SubsonicSong[]
}

// ─── Resource URL helpers ─────────────────────────────────────────────────────

export function getCoverArtUrl(coverArt: string | undefined, size = 300): string {
  if (!coverArt) return ''
  return subsonicUrl('getCoverArt', coverArt, { size })
}

export function getStreamUrl(songId: string): string {
  return subsonicUrl('stream', songId)
}

export function getDownloadUrl(songId: string): string {
  return subsonicUrl('download', songId)
}

// ─── API methods ──────────────────────────────────────────────────────────────

export async function ping(): Promise<boolean> {
  try {
    await subsonicFetch('ping')
    return true
  } catch {
    return false
  }
}

// Albums
export type AlbumListType =
  | 'random'
  | 'newest'
  | 'highest'
  | 'frequent'
  | 'recent'
  | 'starred'
  | 'alphabeticalByName'
  | 'alphabeticalByArtist'
  | 'byYear'
  | 'byGenre'

export async function getAlbumList(
  type: AlbumListType = 'recent',
  size = 20,
  offset = 0,
  extra?: Record<string, string | number>,
): Promise<SubsonicAlbum[]> {
  const data = await subsonicFetch<{ albumList2: { album: SubsonicAlbum[] } }>(
    'getAlbumList2',
    null,
    { type, size, offset, ...extra },
  )
  return data.albumList2?.album ?? []
}

export async function getAlbum(id: string): Promise<SubsonicAlbumWithSongs> {
  const data = await subsonicFetch<{ album: SubsonicAlbumWithSongs }>('getAlbum', id)
  return data.album
}

// Artists
export async function getArtists(): Promise<SubsonicArtist[]> {
  const data = await subsonicFetch<{ artists: { index: Array<{ artist: SubsonicArtist[] }> } }>('getArtists')
  return (data.artists?.index ?? []).flatMap((i) => i.artist ?? [])
}

export async function getArtist(id: string): Promise<{
  id: string
  name: string
  albumCount: number
  album: SubsonicAlbum[]
  coverArt?: string
}> {
  const data = await subsonicFetch<{
    artist: {
      id: string
      name: string
      albumCount: number
      album: SubsonicAlbum[]
      coverArt?: string
    }
  }>('getArtist', id)
  return data.artist
}

export async function getArtistInfo(id: string): Promise<SubsonicArtistInfo> {
  const data = await subsonicFetch<{ artistInfo2: SubsonicArtistInfo }>('getArtistInfo2', id, {
    count: 5,
  })
  return data.artistInfo2 ?? {}
}

// Songs / starred
export async function getStarred(): Promise<{
  artist: SubsonicArtist[]
  album: SubsonicAlbum[]
  song: SubsonicSong[]
}> {
  const data = await subsonicFetch<{
    starred2: { artist?: SubsonicArtist[]; album?: SubsonicAlbum[]; song?: SubsonicSong[] }
  }>('getStarred2')
  return {
    artist: data.starred2?.artist ?? [],
    album: data.starred2?.album ?? [],
    song: data.starred2?.song ?? [],
  }
}

export async function star(id: string): Promise<void> {
  await subsonicFetch('star', null, { id })
}

export async function unstar(id: string): Promise<void> {
  await subsonicFetch('unstar', null, { id })
}

// Playlists
export async function getPlaylists(): Promise<SubsonicPlaylist[]> {
  const data = await subsonicFetch<{ playlists: { playlist: SubsonicPlaylist[] } }>('getPlaylists')
  return data.playlists?.playlist ?? []
}

export async function getPlaylist(id: string): Promise<SubsonicPlaylistWithSongs> {
  const data = await subsonicFetch<{ playlist: SubsonicPlaylistWithSongs }>('getPlaylist', id)
  return data.playlist
}

export async function createPlaylist(name: string): Promise<SubsonicPlaylist> {
  const data = await subsonicFetch<{ playlist: SubsonicPlaylist }>('createPlaylist', null, { name })
  return data.playlist
}

export async function deletePlaylist(id: string): Promise<void> {
  await subsonicFetch('deletePlaylist', null, { id })
}

export async function updatePlaylist(
  playlistId: string,
  opts: {
    name?: string
    comment?: string
    public?: boolean
    songIdToAdd?: string[]
    songIndexToRemove?: number[]
  },
): Promise<void> {
  await subsonicFetch('updatePlaylist', null, {
    playlistId,
    ...(opts.name !== undefined && { name: opts.name }),
    ...(opts.comment !== undefined && { comment: opts.comment }),
    ...(opts.public !== undefined && { public: String(opts.public) }),
    ...(opts.songIdToAdd && { songIdToAdd: opts.songIdToAdd }),
    ...(opts.songIndexToRemove && {
      songIndexToRemove: opts.songIndexToRemove.map(String),
    }),
  })
}

// Search
export interface SearchResult {
  artist: SubsonicArtist[]
  album: SubsonicAlbum[]
  song: SubsonicSong[]
}

export async function search(
  query: string,
  artistCount = 3,
  albumCount = 5,
  songCount = 10,
  offset = 0,
): Promise<SearchResult> {
  const data = await subsonicFetch<{
    searchResult3: {
      artist?: SubsonicArtist[]
      album?: SubsonicAlbum[]
      song?: SubsonicSong[]
    }
  }>('search3', null, { query, artistCount, albumCount, songCount, artistOffset: offset })

  return {
    artist: data.searchResult3?.artist ?? [],
    album: data.searchResult3?.album ?? [],
    song: data.searchResult3?.song ?? [],
  }
}

// Scrobble / now playing
export async function scrobble(id: string, submission = true): Promise<void> {
  await subsonicFetch('scrobble', null, { id, submission: String(submission) })
}

export interface NowPlayingEntry {
  username: string
  minutesAgo: number
  playerId: number
  playerName?: string
  id: string
  title: string
  artist?: string
  album?: string
  albumId?: string
  artistId?: string
  coverArt?: string
  duration: number
}

export async function getNowPlaying(): Promise<NowPlayingEntry[]> {
  try {
    const data = await subsonicFetch<{ nowPlaying: { entry: NowPlayingEntry[] } }>('getNowPlaying')
    return data.nowPlaying?.entry ?? []
  } catch {
    return []
  }
}

// Genres
export async function getGenres(): Promise<Array<{ value: string; songCount: number; albumCount: number }>> {
  const data = await subsonicFetch<{
    genres: { genre: Array<{ value: string; songCount: number; albumCount: number }> }
  }>('getGenres')
  return data.genres?.genre ?? []
}

// Random songs
export async function getRandomSongs(size = 10, genre?: string): Promise<SubsonicSong[]> {
  const data = await subsonicFetch<{ randomSongs: { song: SubsonicSong[] } }>(
    'getRandomSongs',
    null,
    { size, ...(genre && { genre }) },
  )
  return data.randomSongs?.song ?? []
}

// Songs by genre
export async function getSongsByGenre(genre: string, count = 50, offset = 0): Promise<SubsonicSong[]> {
  const data = await subsonicFetch<{ songsByGenre: { song: SubsonicSong[] } }>(
    'getSongsByGenre',
    null,
    { genre, count, offset },
  )
  return data.songsByGenre?.song ?? []
}

// Similar songs
export async function getSimilarSongs(id: string, count = 50): Promise<SubsonicSong[]> {
  const data = await subsonicFetch<{ similarSongs2: { song: SubsonicSong[] } }>(
    'getSimilarSongs2',
    id,
    { count },
  )
  return data.similarSongs2?.song ?? []
}

// Top songs for artist
export async function getTopSongs(artist: string, count = 50): Promise<SubsonicSong[]> {
  const data = await subsonicFetch<{ topSongs: { song: SubsonicSong[] } }>(
    'getTopSongs',
    null,
    { artist, count },
  )
  return data.topSongs?.song ?? []
}

// Rating
export async function setRating(id: string, rating: number): Promise<void> {
  await subsonicFetch('setRating', id, { rating })
}

// ─── Internet Radio ───────────────────────────────────────────────────────────

export interface SubsonicRadioStation {
  id: string
  name: string
  streamUrl: string
  homePageUrl?: string
}

export async function getInternetRadioStations(): Promise<SubsonicRadioStation[]> {
  const data = await subsonicFetch<{
    internetRadioStations: { internetRadioStation: SubsonicRadioStation[] }
  }>('getInternetRadioStations')
  return data.internetRadioStations?.internetRadioStation ?? []
}

export async function createInternetRadioStation(
  name: string,
  streamUrl: string,
  homePageUrl?: string,
): Promise<void> {
  await subsonicFetch('createInternetRadioStation', null, {
    name,
    streamUrl,
    ...(homePageUrl && { homePageUrl }),
  })
}

export async function updateInternetRadioStation(
  id: string,
  name: string,
  streamUrl: string,
  homePageUrl?: string,
): Promise<void> {
  await subsonicFetch('updateInternetRadioStation', id, {
    name,
    streamUrl,
    ...(homePageUrl && { homePageUrl }),
  })
}

export async function deleteInternetRadioStation(id: string): Promise<void> {
  await subsonicFetch('deleteInternetRadioStation', id)
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export interface SubsonicShare {
  id: string
  url: string
  description?: string
  username: string
  created: string
  expires?: string
  lastVisited?: string
  visitCount: number
  entry: SubsonicSong[]
  downloadable?: boolean
}

export async function getShares(): Promise<SubsonicShare[]> {
  const data = await subsonicFetch<{ shares: { share: SubsonicShare[] } }>('getShares')
  return data.shares?.share ?? []
}

export async function createShare(
  ids: string[],
  description?: string,
  expires?: string,
  downloadable?: boolean,
): Promise<SubsonicShare> {
  const extra: Record<string, string | number | boolean | string[]> = { id: ids }
  if (description) extra.description = description
  if (expires) extra.expires = expires
  if (downloadable !== undefined) extra.downloadable = downloadable
  const data = await subsonicFetch<{ shares: { share: SubsonicShare[] } }>('createShare', null, extra)
  return data.shares?.share?.[0]!
}

export async function updateShare(
  id: string,
  description?: string,
  expires?: string,
  downloadable?: boolean,
): Promise<void> {
  const extra: Record<string, string | number | boolean | string[]> = {}
  if (description !== undefined) extra.description = description
  if (expires !== undefined) extra.expires = expires
  if (downloadable !== undefined) extra.downloadable = downloadable
  await subsonicFetch('updateShare', id, extra)
}

export async function deleteShare(id: string): Promise<void> {
  await subsonicFetch('deleteShare', id)
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export interface SubsonicBookmark {
  position: number
  username: string
  comment?: string
  created: string
  changed: string
  entry: SubsonicSong
}

export async function getBookmarks(): Promise<SubsonicBookmark[]> {
  const data = await subsonicFetch<{ bookmarks: { bookmark: SubsonicBookmark[] } }>('getBookmarks')
  return data.bookmarks?.bookmark ?? []
}

export async function createBookmark(id: string, position: number, comment?: string): Promise<void> {
  await subsonicFetch('createBookmark', id, { position, ...(comment && { comment }) })
}

export async function deleteBookmark(id: string): Promise<void> {
  await subsonicFetch('deleteBookmark', id)
}

// ─── Play Queue ───────────────────────────────────────────────────────────────

export interface SubsonicPlayQueue {
  entry: SubsonicSong[]
  current?: string
  position?: number
  username: string
  changed: string
  changedBy: string
}

export async function getPlayQueue(): Promise<SubsonicPlayQueue | null> {
  try {
    const data = await subsonicFetch<{ playQueue: SubsonicPlayQueue }>('getPlayQueue')
    return data.playQueue ?? null
  } catch {
    return null
  }
}

export async function savePlayQueue(
  ids: string[],
  current?: string,
  position?: number,
): Promise<void> {
  if (!ids.length) return
  await subsonicFetch('savePlayQueue', null, {
    id: ids,
    ...(current && { current }),
    ...(position !== undefined && { position }),
  })
}

// ─── Lyrics ───────────────────────────────────────────────────────────────────

export interface SubsonicLyrics {
  artist?: string
  title?: string
  value?: string
  lang?: string
  synced?: boolean
  line?: Array<{ start: number; value: string }>
}

export async function getLyricsBySongId(id: string): Promise<SubsonicLyrics | null> {
  try {
    const data = await subsonicFetch<{ lyricsList: { structuredLyrics: SubsonicLyrics[] } }>(
      'getLyricsBySongId',
      id,
    )
    return data.lyricsList?.structuredLyrics?.[0] ?? null
  } catch {
    return null
  }
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

export interface ScanStatus {
  scanning: boolean
  count: number
  folderCount?: number
  lastScan?: string
  error?: string
}

export async function getScanStatus(): Promise<ScanStatus> {
  const data = await subsonicFetch<{ scanStatus: ScanStatus }>('getScanStatus')
  return data.scanStatus
}

export async function startScan(): Promise<ScanStatus> {
  const data = await subsonicFetch<{ scanStatus: ScanStatus }>('startScan')
  return data.scanStatus
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function getAvatarUrl(username: string): string {
  return subsonicUrl('getAvatar', null, { username })
}

// ─── Transcoding ──────────────────────────────────────────────────────────────

export interface TranscodeDecision {
  canDirectPlay: boolean
  transcodeParams?: string
  transcodeStream?: {
    codec: string
    container: string
    bitRate: number
  } | null
}

/**
 * Ask the server to decide whether a song should be direct-played or
 * transcoded given the browser's capability profile.
 *
 * The request body is a JSON-serialised BrowserProfile; the endpoint is a
 * non-standard Navidrome extension (OpenSubsonic) reachable via POST.
 */
export async function getTranscodeDecision(
  songId: string,
  browserProfile: unknown,
): Promise<TranscodeDecision> {
  const url = subsonicUrl('getTranscodeDecision', null, { mediaId: songId, mediaType: 'song' })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [CLIENT_ID_HEADER]: CLIENT_ID,
    },
    body: JSON.stringify(browserProfile),
  })

  if (!res.ok) throw new Error(`getTranscodeDecision HTTP ${res.status}`)

  const json = await res.json()
  const resp = json['subsonic-response']
  if (resp?.status === 'failed') {
    throw new Error(`getTranscodeDecision: ${resp.error?.message ?? 'unknown error'}`)
  }

  return resp.transcodeDecision as TranscodeDecision
}

/**
 * Build a `getTranscodeStream` URL.  The `transcodeParams` value is the
 * opaque JWT returned by `getTranscodeDecision` and must be forwarded as-is.
 */
export function getTranscodeStreamUrl(
  songId: string,
  transcodeParams: string,
  offsetMs?: number,
): string {
  return subsonicUrl('getTranscodeStream', null, {
    mediaId: songId,
    mediaType: 'song',
    transcodeParams,
    ...(offsetMs != null && offsetMs > 0 ? { offset: Math.floor(offsetMs) } : {}),
  })
}

