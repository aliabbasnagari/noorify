// Native REST API resource shapes. Deliberately partial — each interface
// only types the fields this codebase actually reads, not the full response
// (which carries many more fields per old-ui/src/i18n/en.json's field list).
// Field names are taken directly from the Go model structs' `json:` tags
// (model/mediafile.go, model/album.go, model/artist.go, model/playlist.go)
// — old-ui's translated field *labels* are not a reliable guide to the
// actual wire field names (e.g. Album has no plain `artist`/`artistId`,
// only `albumArtist`/`albumArtistId`).

export interface Song {
  id: string
  title: string
  artist: string
  artistId: string
  albumId: string
  album: string
  duration: number
  trackNumber?: number
  discNumber?: number
  starred: boolean
  rating: number
  genre?: string
  year?: number
  playCount?: number
  bpm?: number
  tags?: Record<string, string[]>
}

/** Full `/api/song/{id}` record (model.MediaFile) — what "Get Info" shows. */
export interface SongDetails extends Song {
  path: string
  libraryName?: string
  albumArtistId: string
  albumArtist: string
  discSubtitle?: string
  year?: number
  size: number
  suffix?: string
  codec?: string
  bitRate?: number
  bitDepth?: number
  sampleRate?: number
  channels?: number
  compilation?: boolean
  comment?: string
  bpm?: number
  playCount?: number
  playDate?: string
  updatedAt?: string
  rgAlbumGain?: number | null
  rgTrackGain?: number | null
  genres?: { id: string; name: string }[]
  tags?: Record<string, string[]>
  participants?: Record<string, { id: string; name: string }[]>
}

export interface Genre {
  id: string
  name: string
}

export interface Tag {
  id: string
  tagName: string
  tagValue: string
}

export interface Album {
  id: string
  name: string
  albumArtist: string
  albumArtistId: string
  songCount: number
  duration: number
  maxYear?: number
  starred: boolean
  rating: number
}

export interface Artist {
  id: string
  name: string
  albumCount: number
  biography?: string
  starred: boolean
  rating: number
}

/** model/share.go. `resourceType`/`resourceIds` are set only on create and
 * are otherwise immutable — the server always recomputes `resourceType`
 * from the actual resource kind, ignoring whatever the client sends
 * (core/share.go), and only `description`/`downloadable`/`expiresAt` are
 * writable via PUT. */
export interface Share {
  id: string
  userId: string
  username: string
  description?: string
  downloadable: boolean
  expiresAt?: string
  lastVisitedAt?: string
  resourceIds: string
  resourceType: string
  contents: string
  /** `omitempty` on the Go side — absent entirely (not 0) when a share has
   * never been visited. */
  visitCount?: number
  createdAt: string
}

/** model/library.go. Library ID 1 is special server-side (`model.DefaultLibraryID`):
 * its `path` is immutable after creation and it can never be deleted —
 * admin UI must disable those specifically for id===1, not just "the first
 * one in the list". */
export interface Library {
  id: number
  name: string
  path: string
  remotePath?: string
  lastScanAt?: string
  lastScanStartedAt?: string
  fullScanInProgress: boolean
  createdAt: string
  updatedAt: string
  totalSongs: number
  totalAlbums: number
  totalArtists: number
  totalFolders: number
  totalFiles: number
  totalMissingFiles: number
  totalSize: number
  totalDuration: number
  defaultNewUsers: boolean
  /** Per-library persistent-ID overrides; empty means "use the global setting". */
  pidAlbum?: string
  pidTrack?: string
}

/** model/user.go. `password`/`currentPassword` are write-only (never present
 * on read; `omitempty` on the Go side) — set `password` to change it, and
 * `currentPassword` alongside it when a non-admin is changing their own
 * (the server skips that check entirely for an admin editing someone else).
 * `libraries` is populated on read only, and only non-admins need an
 * explicit assignment (an admin implicitly gets every library server-side). */
export interface AdminUser {
  id: string
  userName: string
  name: string
  email?: string
  isAdmin: boolean
  lastLoginAt?: string
  lastAccessAt?: string
  createdAt: string
  updatedAt: string
  scrobbleFilter?: string
  libraries?: Library[]
  password?: string
  currentPassword?: string
}

/** model/player.go. Players self-register when a client connects — there's
 * no "create" flow in the admin UI, only view/edit (transcoding assignment,
 * max bitrate, flags)/delete for cleaning up stale entries. `userName` is a
 * joined display field, not a real column. */
export interface Player {
  id: string
  name: string
  userName: string
  userId: string
  userAgent?: string
  client?: string
  ip?: string
  lastSeen?: string
  transcodingId?: string
  maxBitRate?: number
  reportRealPath: boolean
  scrobbleEnabled: boolean
}

/** model/transcoding.go. `command` is silently blanked (`""`) in every
 * response to a non-admin caller — never assume a non-empty value without
 * checking the session's admin flag first. */
export interface Transcoding {
  id: string
  name: string
  targetFormat: string
  command: string
  defaultBitRate: number
}

/** `/api/missing` — not a distinct model, it's `model.MediaFile` rows with
 * `missing: true` (server always injects that filter server-side); every
 * MediaFile field is technically present, but these are the ones the UI
 * actually reads. */
export interface MissingFile {
  id: string
  path: string
  libraryId: number
  libraryName?: string
  title?: string
  album?: string
  albumId?: string
  artist?: string
  size: number
  updatedAt: string
  createdAt: string
}

/** model/plugin.go. `manifest`/`config`/`users`/`libraries` are all
 * stringified JSON — always `JSON.parse` before use, never assume shape
 * without parsing (see `PluginManifest` for what `manifest` decodes to). */
export interface Plugin {
  id: string
  path: string
  manifest: string
  config: string
  users: string
  allUsers: boolean
  libraries: string
  allLibraries: boolean
  allowWriteAccess: boolean
  enabled: boolean
  lastError?: string
  sha256?: string
  createdAt: string
  updatedAt: string
}

/** What `Plugin.manifest` decodes to (`plugins/manifest_gen.go`).
 * `config.schema` is genuine JSON Schema (draft-07); a full schema-driven
 * form renderer (old-ui uses JSONForms) is out of v1 scope here — config is
 * edited as raw JSON text instead, which is a real, disclosed scope
 * trim, not an oversight. */
export interface PluginManifest {
  author?: string
  name: string
  description?: string
  version: string
  website?: string
  config?: {
    schema: Record<string, unknown>
    uiSchema?: Record<string, unknown>
  }
  permissions?: {
    users?: { reason?: string }
    library?: { reason?: string; filesystem?: boolean }
    [key: string]: unknown
  }
}

export interface Radio {
  id: string
  name: string
  streamUrl: string
  homePageUrl?: string
}

export interface Playlist {
  id: string
  name: string
  comment?: string
  songCount: number
  duration: number
  ownerName: string
  public: boolean
  sync: boolean
  /** Non-null means server-managed (smart playlist) — not user-reorderable. */
  rules: unknown | null
}

/** A row from `/api/playlist/{id}/tracks` — a playlist-track join row, NOT
 * a song. `id` is this row's own id (needed for reorder/delete-from-
 * playlist); the underlying song's real id is `mediaFileId`. Go's JSON
 * encoder resolves the embedded MediaFile.ID / PlaylistTrack.ID name
 * collision in favor of the outer (row) field — easy to miss and use the
 * wrong id for streaming/art/scrobbling if you don't read model/playlist.go. */
export interface PlaylistTrack extends Song {
  mediaFileId: string
  playlistId: string
}

// Subsonic API shapes (server/subsonic/responses/responses.go) — distinct
// field naming convention from native REST (e.g. `track` not `trackNumber`),
// used only for the artist-enrichment endpoints native REST doesn't cover
// (bio/similar-artists come from external metadata agents, not the DB).

export interface SubsonicSimilarArtist {
  id: string
  name: string
  albumCount: number
}

export interface SubsonicTopSong {
  id: string
  title: string
  artist: string
  album: string
  albumId: string
  track?: number
  duration: number
}

// getLyricsBySongId (OpenSubsonic) — server/subsonic/responses/responses.go's
// LyricsList/StructuredLyric/Line. A song can have several entries (e.g. a
// synced "main" lyric plus an unsynced fallback, or translations when
// `enhanced=true`) — see pickBestLyric in lib/api/subsonic.ts for how one is
// chosen. `start` is milliseconds from track start; `offset` (also ms) is a
// timing correction to apply on top of every line's `start`.
export interface SubsonicLyricLine {
  start?: number
  value: string
}

export interface SubsonicStructuredLyric {
  displayArtist?: string
  displayTitle?: string
  kind?: string
  lang: string
  line: SubsonicLyricLine[]
  synced: boolean
  offset?: number
}

// search3 (ID3-based global search) response shapes — `ArtistID3`/`AlbumID3`/
// `Child` in server/subsonic/responses/responses.go. Distinct field naming
// from native REST (`starred` is a timestamp or absent, not a boolean;
// `userRating` not `rating`; albums use `artist`/`artistId` not
// `albumArtist`/`albumArtistId`) — see the toArtist/toAlbum/toSong adapters
// in lib/api/subsonic.ts that normalize these into the native REST shapes
// so search results can reuse the same ArtistCard/AlbumCard/SongRow.
export interface SubsonicSearchArtist {
  id: string
  name: string
  albumCount: number
  starred?: string
  userRating?: number
}

export interface SubsonicSearchAlbum {
  id: string
  name: string
  artist?: string
  artistId?: string
  songCount: number
  duration: number
  year?: number
  starred?: string
  userRating?: number
}

export interface SubsonicSearchSong {
  id: string
  title: string
  album?: string
  albumId?: string
  artist?: string
  artistId?: string
  track?: number
  discNumber?: number
  duration?: number
  starred?: string
  userRating?: number
}
