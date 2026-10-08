import { apiFetch } from "@/lib/api/http"
import { isAuthenticated } from "@/stores/auth-store"
import { usePlayerStore, type QueuedTrack } from "@/stores/player-store"

// Persists the play queue through the server's per-user `/api/queue`
// (model.PlayQueue: track ids + current index + position in milliseconds —
// the same record Subsonic's getPlayQueue/savePlayQueue use), so closing the
// tab and coming back later resumes where the user left off, on any device.

/** The subset of the server's MediaFile JSON this module reads. */
interface ServerQueue {
  current?: number
  position?: number
  items?: {
    id: string
    title: string
    artist: string
    artistId: string
    participants?: { artist?: { id: string; name: string }[] }
    albumId: string
    album: string
    duration: number
  }[]
}

const QUEUE_SAVE_DEBOUNCE_MS = 2000
const POSITION_SAVE_INTERVAL_MS = 15000

/** Radio stations aren't media files, so they can't be stored server-side. */
function savableIds(queue: QueuedTrack[]): string[] {
  return queue.filter((t) => !t.isRadio).map((t) => t.id)
}

/** Index into the saved (radio-free) id list, or -1 if the current entry
 * is itself a radio station (nothing meaningful to resume). */
function savableCurrent(queue: QueuedTrack[], currentIndex: number): number {
  if (queue[currentIndex]?.isRadio) return -1
  return queue.slice(0, currentIndex).filter((t) => !t.isRadio).length
}

/** Loads the saved queue into the (paused) player, unless the user has
 * already started playing something by the time the response arrives. */
export async function restoreSavedQueue() {
  if (!isAuthenticated() || usePlayerStore.getState().queue.length > 0) return
  try {
    const saved = await apiFetch<ServerQueue>("/api/queue")
    const items = saved.items ?? []
    if (items.length === 0 || usePlayerStore.getState().queue.length > 0) return
    usePlayerStore.getState().restoreQueue(
      items.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        artistId: s.artistId,
        artists: s.participants?.artist,
        albumId: s.albumId,
        albumTitle: s.album,
        durationSeconds: s.duration,
      })),
      saved.current ?? 0,
      Math.max(saved.position ?? 0, 0) / 1000,
    )
  } catch {
    // Best-effort: no saved queue (or server unreachable) → start empty.
  }
}

function saveFull(position: number) {
  const { queue, currentIndex } = usePlayerStore.getState()
  const ids = savableIds(queue)
  const current = savableCurrent(queue, currentIndex)
  if (!isAuthenticated() || ids.length === 0 || current < 0) return
  apiFetch("/api/queue", {
    method: "PUT",
    body: { ids, current, position: Math.round(position * 1000) },
  }).catch(() => {})
}

function savePosition(keepalive = false) {
  const { queue, currentIndex, currentTime } = usePlayerStore.getState()
  const current = savableCurrent(queue, currentIndex)
  if (!isAuthenticated() || current < 0) return
  apiFetch("/api/queue", {
    method: "PUT",
    body: { current, position: Math.round(currentTime * 1000) },
    keepalive,
  }).catch(() => {})
}

/** Starts saving queue/position changes. Returns a stop function. */
export function startQueueSync(): () => void {
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let lastTrackId =
    usePlayerStore.getState().queue[usePlayerStore.getState().currentIndex]?.id

  const unsubscribe = usePlayerStore.subscribe((state, prev) => {
    // Restoring a saved queue must not immediately write it back.
    if (state.resumeAt !== null) {
      lastTrackId = state.queue[state.currentIndex]?.id
      return
    }
    if (
      state.queue === prev.queue &&
      state.currentIndex === prev.currentIndex &&
      state.playNonce === prev.playNonce
    )
      return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const trackId =
        usePlayerStore.getState().queue[usePlayerStore.getState().currentIndex]
          ?.id
      // A new track starts at 0; telemetry's currentTime is still the old
      // track's until the next timeupdate.
      const position =
        trackId === lastTrackId ? usePlayerStore.getState().currentTime : 0
      lastTrackId = trackId
      saveFull(position)
    }, QUEUE_SAVE_DEBOUNCE_MS)
  })

  const interval = setInterval(() => {
    if (usePlayerStore.getState().isPlaying) savePosition()
  }, POSITION_SAVE_INTERVAL_MS)

  // Also save when the tab is hidden/closed or playback pauses, so the
  // position isn't up to 15s stale. Position-only payloads stay tiny enough
  // for keepalive fetches (64KB cap), unlike the full id list.
  const onHide = () => {
    if (document.visibilityState === "hidden") savePosition(true)
  }
  const onPageHide = () => savePosition(true)
  document.addEventListener("visibilitychange", onHide)
  window.addEventListener("pagehide", onPageHide)
  const unsubscribePause = usePlayerStore.subscribe((state, prev) => {
    if (prev.isPlaying && !state.isPlaying) savePosition()
  })

  return () => {
    clearTimeout(saveTimer)
    clearInterval(interval)
    unsubscribe()
    unsubscribePause()
    document.removeEventListener("visibilitychange", onHide)
    window.removeEventListener("pagehide", onPageHide)
  }
}
