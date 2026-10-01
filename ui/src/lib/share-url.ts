import { config } from "@/lib/config"

// Public share URLs are deliberately built without going through
// lib/api/http or lib/api/subsonic — those attach auth headers/params that
// are meaningless (and semantically wrong) for the `/share/*` routes, which
// are unauthenticated by design (server/public/*.go): capability is the
// share id or a per-track signed token, not a session.
//
// `shareURL` (server: conf.Server.ShareURL), when set, is an absolute
// external origin (+ optional base path) that replaces the app's own
// origin for every public link — e.g. a reverse-proxied public hostname
// different from the admin-facing one. `publicBaseUrl` (default "/share")
// is always appended after it. See core/publicurl/publicurl.go.
function publicBase(): string {
  return config.shareURL || `${window.location.origin}${config.baseURL}`
}

export function shareLinkUrl(shareId: string): string {
  return `${publicBase()}${config.publicBaseUrl}/${shareId}`
}

/** `token` is a share track's own `id` field — already a signed capability
 * token, not a raw media file id (see ShareTrack's doc comment). */
export function shareStreamUrl(token: string): string {
  return `${publicBase()}${config.publicBaseUrl}/s/${token}`
}

export function shareCoverUrl(token: string, size = 300): string {
  return `${publicBase()}${config.publicBaseUrl}/img/${token}?size=${size}`
}

export function shareDownloadUrl(shareId: string): string {
  return `${publicBase()}${config.publicBaseUrl}/d/${shareId}`
}
