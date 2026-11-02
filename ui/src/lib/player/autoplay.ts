import { fetchMixTracks } from '@/lib/player/instant-mix'
import { usePlayerStore, type RepeatMode } from '@/stores/player-store'
import { useSettingsStore } from '@/stores/settings-store'

/** Refill once this few upcoming tracks remain, so the next batch has
 * landed well before the last queued track ends. */
export const AUTOPLAY_THRESHOLD = 2
const AUTOPLAY_BATCH = 25

export function needsAutoplayRefill(state: {
  autoplay: boolean
  repeatMode: RepeatMode
  queueLength: number
  currentIndex: number
  lastIsRadio: boolean
}) {
  return (
    state.autoplay &&
    // Repeat already decides what follows the last track.
    state.repeatMode === 'off' &&
    !state.lastIsRadio &&
    state.currentIndex >= 0 &&
    state.queueLength - state.currentIndex - 1 <= AUTOPLAY_THRESHOLD
  )
}

/**
 * "Don't stop the music": when the queue is about to run out, appends
 * tracks similar to its last one. Call once; returns an unsubscribe.
 */
export function startAutoplay(): () => void {
  let inFlight = false
  // A seed that produced nothing isn't retried until the queue changes, so a
  // quiet library or server doesn't turn every state tick into a request.
  let failedSeedId: string | null = null

  async function refill() {
    const { queue } = usePlayerStore.getState()
    const seed = queue[queue.length - 1]
    inFlight = true
    try {
      const tracks = await fetchMixTracks(
        seed.id,
        AUTOPLAY_BATCH,
        new Set(queue.map((t) => t.id)),
      )
      const latest = usePlayerStore.getState().queue
      // The user replaced or extended the queue while we were fetching —
      // this batch no longer follows what's there.
      if (latest[latest.length - 1] !== seed) return
      if (tracks.length === 0) {
        failedSeedId = seed.id
        return
      }
      usePlayerStore
        .getState()
        .appendToQueue(tracks.map((track) => ({ ...track, autoplay: true })))
    } catch {
      failedSeedId = seed.id
    } finally {
      inFlight = false
      // The queue may have moved on while we were busy (its state changes
      // were skipped by the in-flight guard) — look again. This can't spin:
      // every pass either appends, marks its seed failed, or sees a new seed.
      check()
    }
  }

  function check() {
    if (inFlight) return
    const { queue, currentIndex, repeatMode } = usePlayerStore.getState()
    const last = queue[queue.length - 1]
    if (
      !last ||
      last.id === failedSeedId ||
      !needsAutoplayRefill({
        autoplay: useSettingsStore.getState().autoplay,
        repeatMode,
        queueLength: queue.length,
        currentIndex,
        lastIsRadio: !!last.isRadio,
      })
    ) {
      return
    }
    void refill()
  }

  // The player store ticks on every `timeupdate`, so only re-check when
  // something that feeds `needsAutoplayRefill` actually moved.
  let lastKey = ''
  let lastEnabled = useSettingsStore.getState().autoplay
  const onChange = () => {
    const { queue, currentIndex, repeatMode } = usePlayerStore.getState()
    const enabled = useSettingsStore.getState().autoplay
    // Turning it off and on again is the user's "try once more".
    if (enabled !== lastEnabled) failedSeedId = null
    lastEnabled = enabled
    const key = `${queue.length}:${queue[queue.length - 1]?.id}:${currentIndex}:${repeatMode}:${enabled}`
    if (key === lastKey) return
    lastKey = key
    check()
  }

  const stopPlayer = usePlayerStore.subscribe(onChange)
  const stopSettings = useSettingsStore.subscribe(onChange)
  onChange()
  return () => {
    stopPlayer()
    stopSettings()
  }
}
