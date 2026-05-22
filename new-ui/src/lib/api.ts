/**
 * Navidrome API client
 *
 * Handles JWT-based native API calls (/api/*) and auth (/auth/*).
 * The JWT token is stored in localStorage and sent via the X-ND-Authorization header.
 * On every response, the server may issue a refreshed token in the same header.
 */

export const AUTH_HEADER = 'X-ND-Authorization'
export const CLIENT_ID_HEADER = 'X-ND-Client-Unique-Id'
export const CLIENT_ID = crypto.randomUUID()

// ─── Storage helpers ─────────────────────────────────────────────────────────

export interface AuthInfo {
  id: string
  name: string
  username: string
  isAdmin: boolean
  token: string
  subsonicSalt: string
  subsonicToken: string
  avatar?: string
}

export function storeAuth(info: AuthInfo): void {
  localStorage.setItem('nd:token', info.token)
  localStorage.setItem('nd:userId', info.id)
  localStorage.setItem('nd:name', info.name)
  localStorage.setItem('nd:username', info.username)
  localStorage.setItem('nd:isAdmin', String(info.isAdmin))
  localStorage.setItem('nd:subsonicSalt', info.subsonicSalt)
  localStorage.setItem('nd:subsonicToken', info.subsonicToken)
  if (info.avatar) localStorage.setItem('nd:avatar', info.avatar)
  localStorage.setItem('nd:authenticated', 'true')
}

export function clearAuth(): void {
  const keys = [
    'nd:token', 'nd:userId', 'nd:name', 'nd:username', 'nd:isAdmin',
    'nd:subsonicSalt', 'nd:subsonicToken', 'nd:avatar', 'nd:authenticated',
  ]
  keys.forEach((k) => localStorage.removeItem(k))
}

export function getStoredAuth(): AuthInfo | null {
  const token = localStorage.getItem('nd:token')
  const username = localStorage.getItem('nd:username')
  if (!token || !username) return null
  return {
    token,
    id: localStorage.getItem('nd:userId') ?? '',
    name: localStorage.getItem('nd:name') ?? '',
    username,
    isAdmin: localStorage.getItem('nd:isAdmin') === 'true',
    subsonicSalt: localStorage.getItem('nd:subsonicSalt') ?? '',
    subsonicToken: localStorage.getItem('nd:subsonicToken') ?? '',
    avatar: localStorage.getItem('nd:avatar') ?? undefined,
  }
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('nd:authenticated') === 'true'
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  headers.set(CLIENT_ID_HEADER, CLIENT_ID)

  const token = localStorage.getItem('nd:token')
  if (token) {
    headers.set(AUTH_HEADER, `Bearer ${token}`)
  }

  const res = await fetch(path, { ...options, headers })

  // Refresh token if server issued a new one
  const newToken = res.headers.get(AUTH_HEADER)
  if (newToken) {
    const bare = newToken.replace(/^Bearer\s+/i, '')
    localStorage.setItem('nd:token', bare)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, body || res.statusText)
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<AuthInfo> {
  const data = await request<AuthInfo>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  storeAuth(data)
  return data
}

export async function createAdmin(username: string, password: string): Promise<AuthInfo> {
  const data = await request<AuthInfo>('/auth/createAdmin', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  storeAuth(data)
  return data
}

// ─── Native REST API helpers (/api/*) ─────────────────────────────────────────

export type SortOrder = 'ASC' | 'DESC'

export interface ListParams {
  _start?: number
  _end?: number
  _order?: SortOrder
  _sort?: string
  [key: string]: string | number | boolean | undefined
}

function buildQuery(params?: ListParams): string {
  if (!params) return ''
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) q.append(k, String(v))
  })
  return q.toString() ? `?${q.toString()}` : ''
}

export function apiGet<T>(path: string, params?: ListParams): Promise<T> {
  return request<T>(`/api${path}${buildQuery(params)}`)
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(`/api${path}`, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(`/api${path}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(`/api${path}`, { method: 'DELETE' })
}

// ─── Native MediaFile (returned by /api/* endpoints) ─────────────────────────

export interface NativeMediaFile {
  id: string
  title: string
  album: string
  albumId: string
  artist: string
  artistId: string
  albumArtist: string
  albumArtistId: string
  hasCoverArt: boolean
  trackNumber: number
  discNumber: number
  year: number
  duration: number
  bitRate: number
  suffix: string
  size: number
  path: string
  libraryId: number
}

/** Convert a native MediaFile to the SubsonicSong shape used by the player. */
export function nativeToSubsonic(m: NativeMediaFile) {
  return {
    id: m.id,
    title: m.title,
    album: m.album,
    albumId: m.albumId,
    artist: m.artist,
    artistId: m.artistId,
    coverArt: m.hasCoverArt ? m.id : undefined,
    duration: m.duration,
    bitRate: m.bitRate,
    suffix: m.suffix,
    size: m.size,
    path: m.path,
    contentType: `audio/${m.suffix}`,
    track: m.trackNumber,
    year: m.year,
  }
}

// ─── Artist songs ─────────────────────────────────────────────────────────────

/** GET /api/artist/:id/songs — all tracks for an artist across all albums */
export function getArtistSongs(artistId: string): Promise<NativeMediaFile[]> {
  return apiGet<NativeMediaFile[]>(`/artist/${artistId}/songs`)
}

// ─── Song list (paginated) ────────────────────────────────────────────────────

export interface SongPage {
  data: NativeMediaFile[]
  total: number
}

/**
 * GET /api/song with pagination and optional title search.
 *
 * Unlike `apiGet`, this captures the `x-total-count` response header so the
 * caller knows the full server-side result set size for infinite-scroll logic.
 */
export async function getSongsPage(params: ListParams): Promise<SongPage> {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set(CLIENT_ID_HEADER, CLIENT_ID)
  const token = localStorage.getItem('nd:token')
  if (token) headers.set(AUTH_HEADER, `Bearer ${token}`)

  const res = await fetch(`/api/song${buildQuery(params)}`, { headers })

  const newToken = res.headers.get(AUTH_HEADER)
  if (newToken) localStorage.setItem('nd:token', newToken.replace(/^Bearer\s+/i, ''))

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, body || res.statusText)
  }

  const data = (await res.json()) as NativeMediaFile[]
  const totalHeader = res.headers.get('x-total-count')
  // react-admin style: header may be "0/50" or just "50"
  const total = totalHeader
    ? parseInt(totalHeader.split('/').pop()!, 10)
    : data.length

  return { data, total }
}

// ─── Image upload helpers ─────────────────────────────────────────────────────

async function uploadImageFile(endpoint: string, file: File): Promise<void> {
  const form = new FormData()
  form.append('image', file)

  const headers = new Headers()
  headers.set(CLIENT_ID_HEADER, CLIENT_ID)
  const token = localStorage.getItem('nd:token')
  if (token) headers.set(AUTH_HEADER, `Bearer ${token}`)

  const res = await fetch(`/api${endpoint}`, { method: 'POST', headers, body: form })

  const newToken = res.headers.get(AUTH_HEADER)
  if (newToken) localStorage.setItem('nd:token', newToken.replace(/^Bearer\s+/i, ''))

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, body || res.statusText)
  }
}

/** POST /api/artist/:id/image — upload a custom artist picture (admin only) */
export function uploadArtistImage(artistId: string, file: File): Promise<void> {
  return uploadImageFile(`/artist/${artistId}/image`, file)
}

/** POST /api/playlist/:id/image — upload a custom playlist cover (admin only) */
export function uploadPlaylistImage(playlistId: string, file: File): Promise<void> {
  return uploadImageFile(`/playlist/${playlistId}/image`, file)
}

// ─── Music upload ─────────────────────────────────────────────────────────────

export interface UploadResult {
  filename: string
  path: string
  error?: string
}

export interface UploadOptions {
  libraryId?: number
  folder?: string
}

// ─── User management (admin) ──────────────────────────────────────────────────

export interface NativeUser {
  id: string
  userName: string
  name: string
  email?: string
  isAdmin: boolean
  lastLoginAt?: string
  lastAccessAt?: string
  updatedAt?: string
  libraryIds?: number[]
  changePassword?: boolean
  password?: string
  currentPassword?: string
}

export function getUsers(): Promise<NativeUser[]> {
  return apiGet<NativeUser[]>('/user', { _end: 500 })
}

export function getUser(id: string): Promise<NativeUser> {
  return apiGet<NativeUser>(`/user/${id}`)
}

export function createUser(data: Partial<NativeUser>): Promise<NativeUser> {
  return apiPost<NativeUser>('/user', data)
}

export function updateUser(id: string, data: Partial<NativeUser>): Promise<NativeUser> {
  return apiPut<NativeUser>(`/user/${id}`, data)
}

export function deleteUser(id: string): Promise<void> {
  return apiDelete(`/user/${id}`)
}

// ─── Transcoding config (admin) ───────────────────────────────────────────────

export interface NativeTranscoding {
  id: string
  name: string
  targetFormat: string
  defaultBitRate: number
  command: string
}

export function getTranscodings(): Promise<NativeTranscoding[]> {
  return apiGet<NativeTranscoding[]>('/transcoding', { _end: 200 })
}

export function createTranscoding(data: Partial<NativeTranscoding>): Promise<NativeTranscoding> {
  return apiPost<NativeTranscoding>('/transcoding', data)
}

export function updateTranscoding(id: string, data: Partial<NativeTranscoding>): Promise<NativeTranscoding> {
  return apiPut<NativeTranscoding>(`/transcoding/${id}`, data)
}

export function deleteTranscoding(id: string): Promise<void> {
  return apiDelete(`/transcoding/${id}`)
}

// ─── Library management (admin) ───────────────────────────────────────────────

export interface NativeLibrary {
  id: number
  name: string
  path: string
  defaultNewUsers?: boolean
  totalSongs?: number
  totalAlbums?: number
  totalMissingFiles?: number
  totalSize?: number
  lastScanAt?: string
}

export function getLibraries(): Promise<NativeLibrary[]> {
  return apiGet<NativeLibrary[]>('/library', { _end: 200 })
}

export function createLibrary(data: Partial<NativeLibrary>): Promise<NativeLibrary> {
  return apiPost<NativeLibrary>('/library', data)
}

export function updateLibrary(id: number, data: Partial<NativeLibrary>): Promise<NativeLibrary> {
  return apiPut<NativeLibrary>(`/library/${id}`, data)
}

export function deleteLibrary(id: number): Promise<void> {
  return apiDelete(`/library/${id}`)
}

// ─── Player management ────────────────────────────────────────────────────────

export interface NativePlayer {
  id: string
  name: string
  client: string
  userAgent?: string
  userName?: string
  lastSeen?: string
  maxBitRate?: number
  transcodingId?: string
  reportRealPath?: boolean
}

export function getPlayers(): Promise<NativePlayer[]> {
  return apiGet<NativePlayer[]>('/player', { _end: 200 })
}

export function updatePlayer(id: string, data: Partial<NativePlayer>): Promise<NativePlayer> {
  return apiPut<NativePlayer>(`/player/${id}`, data)
}

export function deletePlayer(id: string): Promise<void> {
  return apiDelete(`/player/${id}`)
}

// ─── Plugin management (admin) ────────────────────────────────────────────────

export interface NativePlugin {
  id: string
  name: string
  enabled: boolean
  manifest?: string
  lastError?: string
  version?: string
  description?: string
  homepage?: string
}

export function getPlugins(): Promise<NativePlugin[]> {
  return apiGet<NativePlugin[]>('/plugin', { _end: 200 })
}

export function enablePlugin(id: string): Promise<void> {
  return apiPut<void>(`/plugin/${id}`, { enabled: true })
}

export function disablePlugin(id: string): Promise<void> {
  return apiPut<void>(`/plugin/${id}`, { enabled: false })
}

// ─── Missing files (admin) ────────────────────────────────────────────────────

export interface NativeMissingFile {
  id: string
  path: string
  size: number
  libraryName?: string
  libraryId?: number
  updatedAt?: string
}

export function getMissingFiles(params?: ListParams): Promise<NativeMissingFile[]> {
  return apiGet<NativeMissingFile[]>('/missing', { _end: 200, ...params })
}

export function deleteMissingFiles(ids: string[]): Promise<void> {
  // Delete each missing file entry
  return apiPost<void>('/missing', { ids })
}

/**
 * POST /api/upload — upload one or more audio files.
 * Uses raw FormData so Content-Type is NOT set to application/json.
 * Admin only.
 */
export async function uploadMusic(
  files: File[],
  options: UploadOptions = {},
): Promise<UploadResult[]> {
  const form = new FormData()
  files.forEach((f) => form.append('file', f))
  if (options.libraryId != null) form.append('libraryId', String(options.libraryId))
  if (options.folder) form.append('folder', options.folder)

  const headers = new Headers()
  headers.set(CLIENT_ID_HEADER, CLIENT_ID)
  const token = localStorage.getItem('nd:token')
  if (token) headers.set(AUTH_HEADER, `Bearer ${token}`)

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers,
    body: form,
  })

  const newToken = res.headers.get(AUTH_HEADER)
  if (newToken) localStorage.setItem('nd:token', newToken.replace(/^Bearer\s+/i, ''))

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, body || res.statusText)
  }

  return res.json() as Promise<UploadResult[]>
}

// ─── Shares (native API) ──────────────────────────────────────────────────────

export interface NativeShare {
  id: string
  userId: string
  username: string
  description?: string
  downloadable: boolean
  expiresAt?: string
  lastVisitedAt?: string
  visitCount: number
  contents?: string
  resourceIds?: string
  resourceType?: string
  tracks?: Array<{ id: string; title: string; artist?: string; album?: string; coverArt?: string; duration: number }>
  createdAt: string
  updatedAt: string
}

export function getShares(): Promise<NativeShare[]> {
  return apiGet<NativeShare[]>('/share', { _end: 500 }).catch((err) => {
    // 404 means EnableSharing is false on the server — return empty list
    if (err instanceof ApiError && err.status === 404) return []
    throw err
  })
}

export function createShare(data: {
  resourceIds: string
  description?: string
  downloadable?: boolean
  expiresAt?: string
}): Promise<NativeShare> {
  return apiPost<NativeShare>('/share', data)
}

export function updateShare(id: string, data: Partial<Pick<NativeShare, 'description' | 'expiresAt' | 'downloadable'>>): Promise<NativeShare> {
  return apiPut<NativeShare>(`/share/${id}`, data)
}

export function deleteShare(id: string): Promise<void> {
  return apiDelete(`/share/${id}`)
}

// ─── LastFM scrobbling ────────────────────────────────────────────────────────

export interface LastFMLinkStatus {
  status: boolean
  apiKey?: string
}

/** GET /api/lastfm/link — returns whether the current user has linked their Last.fm account */
export async function getLastFMLinkStatus(): Promise<LastFMLinkStatus> {
  return request<LastFMLinkStatus>('/api/lastfm/link')
}

/** DELETE /api/lastfm/link — unlinks Last.fm account */
export async function unlinkLastFM(): Promise<void> {
  return request<void>('/api/lastfm/link', { method: 'DELETE' })
}

/** GET /api/lastfm/link/callback URL — returns the URL to open for OAuth linking */
export function getLastFMCallbackUrl(uid: string): string {
  return `${window.location.origin}/api/lastfm/link/callback?uid=${encodeURIComponent(uid)}`
}

// ─── ListenBrainz scrobbling ──────────────────────────────────────────────────

export interface ListenBrainzLinkStatus {
  status: boolean
}

/** GET /api/listenbrainz/link — returns whether the current user has linked their ListenBrainz account */
export async function getListenBrainzLinkStatus(): Promise<ListenBrainzLinkStatus> {
  return request<ListenBrainzLinkStatus>('/api/listenbrainz/link')
}

/** DELETE /api/listenbrainz/link — unlinks ListenBrainz account */
export async function unlinkListenBrainz(): Promise<void> {
  return request<void>('/api/listenbrainz/link', { method: 'DELETE' })
}

/** PUT /api/listenbrainz/link — links ListenBrainz account with a token */
export async function linkListenBrainz(token: string): Promise<void> {
  return request<void>('/api/listenbrainz/link', {
    method: 'PUT',
    body: JSON.stringify({ token }),
  })
}

// ─── Plugin config (admin) ────────────────────────────────────────────────────

/** PUT /api/plugin/:id — update plugin enabled state and/or config JSON */
export async function updatePluginConfig(
  id: string,
  data: { enabled?: boolean; config?: string },
): Promise<void> {
  return request<void>(`/api/plugin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ─── User library access (admin) ──────────────────────────────────────────────

/** Returns all library IDs the given user has access to */
export async function getUserLibraries(userId: string): Promise<number[]> {
  const user = await getUser(userId)
  return user.libraryIds ?? []
}

