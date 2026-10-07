import type { AuthSession } from "@/stores/auth-store"

// Mirrors the payload server/app/serve_index.go injects as `window.__APP_CONFIG__`
// (see old-ui/src/config.js). Dev-mode falls back to these defaults since
// nothing injects the real object outside the served index.html.
export interface AppConfig {
  /** Present when a reverse proxy authenticated this request via a trusted
   * header — the app should sign the user in with this instead of showing
   * the login form. See server/auth.go's handleLoginFromHeaders. */
  auth?: AuthSession
  /** Set only for proxy-authenticated sessions; logout redirects here (the
   * IdP) instead of showing the login form again. */
  extAuthLogoutURL?: string
  version: string
  firstTime: boolean
  baseURL: string
  variousArtistsId: string
  maxSidebarPlaylists: number
  enableTranscodingConfig: boolean
  enableDownloads: boolean
  enableFavourites: boolean
  losslessFormats: string
  welcomeMessage: string
  enableStarRating: boolean
  defaultTheme: string
  defaultLanguage: string
  defaultUIVolume: number
  uiSearchDebounceMs: number
  uiCoverArtSize: number
  enableUserEditing: boolean
  enableArtworkUpload: boolean
  enableSharing: boolean
  shareURL: string
  defaultDownloadableShare: boolean
  lastFMEnabled: boolean
  listenBrainzEnabled: boolean
  enableExternalServices: boolean
  /** Global persistent-ID specs (conf PID.Album / PID.Track); libraries can override them. */
  pidAlbum: string
  pidTrack: string
  enableNowPlaying: boolean
  playbackReportIntervalMs: number
  enableReplayGain: boolean
  enableQuickConnect: boolean
  publicBaseUrl: string
  enableInspect: boolean
  pluginsEnabled: boolean
  devUIShowConfig: boolean
}

declare global {
  interface Window {
    __APP_CONFIG__?: string
    __SHARE_INFO__?: string
  }
}

const defaultConfig: AppConfig = {
  version: "dev",
  firstTime: false,
  baseURL: "",
  variousArtistsId: "63sqASlAfjbGMuLP4JhnZU",
  maxSidebarPlaylists: 100,
  enableTranscodingConfig: true,
  enableDownloads: true,
  enableFavourites: true,
  losslessFormats: "FLAC,WAV,ALAC,DSF",
  welcomeMessage: "",
  enableStarRating: true,
  defaultTheme: "Dark",
  defaultLanguage: "",
  defaultUIVolume: 100,
  uiSearchDebounceMs: 200,
  uiCoverArtSize: 600,
  enableUserEditing: true,
  enableArtworkUpload: true,
  enableSharing: true,
  shareURL: "",
  defaultDownloadableShare: true,
  lastFMEnabled: true,
  listenBrainzEnabled: true,
  enableExternalServices: true,
  pidAlbum: "musicbrainz_albumid|albumartistid,album,albumversion,releasedate", // consts.DefaultAlbumPID
  pidTrack: "musicbrainz_trackid|albumid,discnumber,tracknumber,title", // consts.DefaultTrackPID
  enableNowPlaying: true,
  playbackReportIntervalMs: 60000,
  enableReplayGain: true,
  enableQuickConnect: false,
  publicBaseUrl: "/share",
  enableInspect: true,
  pluginsEnabled: true,
  devUIShowConfig: false,
}

function parseInjected<T>(raw: string | undefined): Partial<T> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Partial<T>
  } catch {
    return null
  }
}

export const config: AppConfig = {
  ...defaultConfig,
  ...(parseInjected<AppConfig>(window.__APP_CONFIG__) ?? {}),
}

// Matches server/serve_index.go's shareData/shareTrack structs exactly —
// injected only on a public `/share/{id}` page load (server/public's
// handleShares -> IndexWithShare), never on the normal authenticated app.
// Each track's `id` here is NOT a real media file id — it's a signed,
// expiring capability token (server/public/handle_shares.go's
// encodeMediafileShare) that only works against the `/share/*` public
// endpoints (see lib/share-url.ts), not the authenticated Subsonic/REST
// clients.
export interface ShareTrack {
  id: string
  title: string
  artist?: string
  album?: string
  updatedAt: string
  duration?: number
}

export interface ShareInfo {
  id: string
  description?: string
  downloadable: boolean
  tracks: ShareTrack[]
}

export const shareInfo = parseInjected<ShareInfo>(
  window.__SHARE_INFO__,
) as ShareInfo | null

/** Called once the first admin account exists, so a later logout shows the login form. */
export function markSetupComplete() {
  config.firstTime = false
}
