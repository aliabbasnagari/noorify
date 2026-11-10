import type { QueuedTrack } from '@/stores/player-store'

const trackKeys = new WeakMap<QueuedTrack, number>()
let nextKey = 0

/**
 * One stable, unique id per queue entry, for drag-and-drop and React keys.
 * A track's id is its object identity, so it survives reorders (the track id
 * doesn't — the same song can be queued twice — and its index changes on
 * every move). A queue holding the very same object twice still gets
 * distinct ids.
 */
export function queueItemIds(queue: QueuedTrack[]): string[] {
  const seen = new Set<string>()
  return queue.map((track, index) => {
    let key = trackKeys.get(track)
    if (key === undefined) {
      key = nextKey++
      trackKeys.set(track, key)
    }
    let id = `q${key}`
    if (seen.has(id)) id = `${id}-${index}`
    seen.add(id)
    return id
  })
}
