import { describe, expect, it } from 'vitest'
import type { QueuedTrack } from '@/stores/player-store'
import { queueItemIds } from './queue-ids'

function track(id: string): QueuedTrack {
  return {
    id,
    title: id,
    artist: 'Artist',
    albumId: 'al',
    albumTitle: 'Album',
    durationSeconds: 100,
  }
}

describe('queueItemIds', () => {
  it('gives every entry its own id', () => {
    const ids = queueItemIds([track('a'), track('b'), track('c')])
    expect(new Set(ids).size).toBe(3)
  })

  it('keeps an entry’s id when the queue is reordered', () => {
    const [a, b, c] = [track('a'), track('b'), track('c')]
    const before = queueItemIds([a, b, c])
    const after = queueItemIds([a, c, b])
    expect(after).toEqual([before[0], before[2], before[1]])
  })

  it('tells apart the same song queued twice', () => {
    const ids = queueItemIds([track('same'), track('same')])
    expect(ids[0]).not.toBe(ids[1])
  })

  it('still returns unique ids if the very same object is queued twice', () => {
    const t = track('a')
    const ids = queueItemIds([t, t, t])
    expect(new Set(ids).size).toBe(3)
  })
})
