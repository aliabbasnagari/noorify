import { getCoverArtUrl } from '@/lib/api/subsonic'
import type { QueuedTrack } from '@/stores/player-store'
import { useSettingsStore } from '@/stores/settings-store'

/** The Notification API only exists in secure contexts (HTTPS/localhost). */
export function notificationsAvailable(): boolean {
  return 'Notification' in window && window.isSecureContext
}

/** Posts "now playing" for `track` if the user opted in and the browser
 * still allows it. Never throws — a notification must not affect playback. */
export function notifyTrackChange(track: QueuedTrack) {
  if (!useSettingsStore.getState().notifications) return
  if (!notificationsAvailable() || Notification.permission !== 'granted') return
  try {
    new Notification(track.title, {
      body: [track.artist, track.albumTitle].filter(Boolean).join(' — '),
      icon: track.isRadio ? undefined : getCoverArtUrl(track.id, 'mf', 256),
      // Replace the previous notification instead of stacking one per track.
      tag: 'nd-now-playing',
      silent: true,
    })
  } catch {
    // Some mobile browsers expose Notification but only allow it from a
    // service worker; there's nothing useful to do about that here.
  }
}
