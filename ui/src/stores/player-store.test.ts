import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore, type QueuedTrack } from './player-store'

function track(id: string): QueuedTrack {
  return {
    id,
    title: `Track ${id}`,
    artist: 'Artist',
    albumId: 'album-1',
    albumTitle: 'Album',
    durationSeconds: 180,
  }
}

function resetStore() {
  usePlayerStore.setState({
    queue: [],
    currentIndex: -1,
    playNonce: 0,
    shuffle: false,
    unshuffledQueue: null,
    repeatMode: 'off',
    volume: 100,
    muted: false,
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
  })
}

describe('player-store', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it('setQueue replaces the queue and starts at the given index', () => {
    const tracks = [track('a'), track('b'), track('c')]
    usePlayerStore.getState().setQueue(tracks, 1)
    expect(usePlayerStore.getState().queue).toEqual(tracks)
    expect(usePlayerStore.getState().currentIndex).toBe(1)
  })

  it('setQueue clears any shuffle state from a previous queue', () => {
    usePlayerStore.getState().setQueue([track('a'), track('b')], 0)
    usePlayerStore.getState().toggleShuffle()
    usePlayerStore.getState().setQueue([track('x'), track('y')], 0)
    expect(usePlayerStore.getState().shuffle).toBe(false)
    expect(usePlayerStore.getState().unshuffledQueue).toBeNull()
  })

  describe('playNext / playPrevious', () => {
    it('advances to the next track', () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 0)
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(1)
    })

    it('stops at the end of the queue when repeat is off', () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 1)
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(1)
    })

    it("wraps to the start when repeat is 'all'", () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 1)
      usePlayerStore.getState().cycleRepeatMode() // off -> all
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(0)
    })

    it('goes back to the previous track', () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 1)
      usePlayerStore.getState().playPrevious()
      expect(usePlayerStore.getState().currentIndex).toBe(0)
    })

    it("wraps to the end when repeat is 'all' and at the start", () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 0)
      usePlayerStore.getState().cycleRepeatMode()
      usePlayerStore.getState().playPrevious()
      expect(usePlayerStore.getState().currentIndex).toBe(1)
    })
  })

  it('cycleRepeatMode cycles off -> all -> one -> off', () => {
    expect(usePlayerStore.getState().repeatMode).toBe('off')
    usePlayerStore.getState().cycleRepeatMode()
    expect(usePlayerStore.getState().repeatMode).toBe('all')
    usePlayerStore.getState().cycleRepeatMode()
    expect(usePlayerStore.getState().repeatMode).toBe('one')
    usePlayerStore.getState().cycleRepeatMode()
    expect(usePlayerStore.getState().repeatMode).toBe('off')
  })

  describe('queue editing', () => {
    it('addToQueue appends to the end', () => {
      usePlayerStore.getState().setQueue([track('a')], 0)
      usePlayerStore.getState().addToQueue(track('b'))
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'a',
        'b',
      ])
    })

    it('playNextInQueue inserts right after the current track', () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 0)
      usePlayerStore.getState().playNextInQueue(track('x'))
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'a',
        'x',
        'b',
      ])
    })

    it('removeFromQueue removes an upcoming track and keeps currentIndex correct', () => {
      usePlayerStore
        .getState()
        .setQueue([track('a'), track('b'), track('c')], 0)
      usePlayerStore.getState().removeFromQueue(1)
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'a',
        'c',
      ])
      expect(usePlayerStore.getState().currentIndex).toBe(0)
    })

    it('removeFromQueue refuses to remove the currently playing track', () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 0)
      usePlayerStore.getState().removeFromQueue(0)
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'a',
        'b',
      ])
    })

    const ids = () => usePlayerStore.getState().queue.map((t) => t.id)
    const seed = (current: number) =>
      usePlayerStore
        .getState()
        .setQueue([track('a'), track('b'), track('c'), track('d')], current)

    it('moveInQueue swaps two neighbouring upcoming tracks', () => {
      seed(0)
      usePlayerStore.getState().moveInQueue(1, 2)
      expect(ids()).toEqual(['a', 'c', 'b', 'd'])
    })

    it('moveInQueue drags an upcoming track a long way in either direction', () => {
      seed(0)
      usePlayerStore.getState().moveInQueue(1, 3)
      expect(ids()).toEqual(['a', 'c', 'd', 'b'])
      usePlayerStore.getState().moveInQueue(3, 1)
      expect(ids()).toEqual(['a', 'b', 'c', 'd'])
    })

    it('moveInQueue keeps the playing track and its index fixed', () => {
      seed(1)
      usePlayerStore.getState().moveInQueue(3, 2)
      expect(ids()).toEqual(['a', 'b', 'd', 'c'])
      expect(usePlayerStore.getState().currentIndex).toBe(1)
    })

    it('moveInQueue refuses to move the now-playing or an already-played track', () => {
      seed(1)
      usePlayerStore.getState().moveInQueue(1, 2) // now-playing
      usePlayerStore.getState().moveInQueue(0, 3) // played
      expect(ids()).toEqual(['a', 'b', 'c', 'd'])
    })

    it('moveInQueue refuses to drop a track on or before the now-playing one', () => {
      seed(1)
      usePlayerStore.getState().moveInQueue(3, 1)
      usePlayerStore.getState().moveInQueue(3, 0)
      expect(ids()).toEqual(['a', 'b', 'c', 'd'])
    })

    it('moveInQueue ignores out-of-range and no-op moves', () => {
      seed(0)
      const before = usePlayerStore.getState().queue
      usePlayerStore.getState().moveInQueue(2, 2)
      usePlayerStore.getState().moveInQueue(2, 9)
      usePlayerStore.getState().moveInQueue(-1, 2)
      expect(usePlayerStore.getState().queue).toBe(before)
    })

    it('moveInQueue does not restart playback', () => {
      seed(0)
      const nonce = usePlayerStore.getState().playNonce
      usePlayerStore.getState().moveInQueue(1, 3)
      expect(usePlayerStore.getState().playNonce).toBe(nonce)
    })
  })

  describe('shuffle', () => {
    it('keeps the currently playing track in place and restores order on toggle off', () => {
      const tracks = [
        track('a'),
        track('b'),
        track('c'),
        track('d'),
        track('e'),
      ]
      usePlayerStore.getState().setQueue(tracks, 1)
      usePlayerStore.getState().toggleShuffle()

      const { queue, currentIndex, shuffle } = usePlayerStore.getState()
      expect(shuffle).toBe(true)
      expect(queue[currentIndex].id).toBe('b')
      expect(queue.slice(0, 2).map((t) => t.id)).toEqual(['a', 'b'])

      usePlayerStore.getState().toggleShuffle()
      const restored = usePlayerStore.getState()
      expect(restored.shuffle).toBe(false)
      expect(restored.queue.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(restored.currentIndex).toBe(1)
    })

    it('keeps tracks added while shuffled when shuffle is turned off', () => {
      usePlayerStore
        .getState()
        .setQueue([track('a'), track('b'), track('c'), track('d')], 0)
      usePlayerStore.getState().toggleShuffle()
      usePlayerStore.getState().addToQueue(track('x'))
      usePlayerStore.getState().playNextInQueue(track('y'))

      usePlayerStore.getState().toggleShuffle()
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'a',
        'y',
        'b',
        'c',
        'd',
        'x',
      ])
    })

    it('does not resurrect tracks removed while shuffled', () => {
      usePlayerStore
        .getState()
        .setQueue([track('a'), track('b'), track('c')], 0)
      usePlayerStore.getState().toggleShuffle()
      const removeAt = usePlayerStore
        .getState()
        .queue.findIndex((t) => t.id === 'c')
      usePlayerStore.getState().removeFromQueue(removeAt)

      usePlayerStore.getState().toggleShuffle()
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'a',
        'b',
      ])
    })
  })

  describe('playNonce', () => {
    it('bumps when repeat-all wraps a single-track queue onto itself', () => {
      usePlayerStore.getState().setQueue([track('a')], 0)
      usePlayerStore.getState().cycleRepeatMode() // off -> all
      const before = usePlayerStore.getState().playNonce
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(0)
      expect(usePlayerStore.getState().playNonce).toBe(before + 1)
    })

    it('bumps when the current track is re-selected', () => {
      usePlayerStore.getState().setQueue([track('a'), track('b')], 0)
      const before = usePlayerStore.getState().playNonce
      usePlayerStore.getState().playTrackAt(0)
      expect(usePlayerStore.getState().playNonce).toBe(before + 1)
    })

    it('does not bump at the end of the queue with repeat off', () => {
      usePlayerStore.getState().setQueue([track('a')], 0)
      const before = usePlayerStore.getState().playNonce
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().playNonce).toBe(before)
    })
  })

  describe('volume', () => {
    it('clamps to 0-100 and clears mute', () => {
      usePlayerStore.getState().toggleMute()
      usePlayerStore.getState().setVolume(150)
      expect(usePlayerStore.getState().volume).toBe(100)
      expect(usePlayerStore.getState().muted).toBe(false)

      usePlayerStore.getState().setVolume(-10)
      expect(usePlayerStore.getState().volume).toBe(0)
    })

    it('toggleMute flips the muted flag', () => {
      expect(usePlayerStore.getState().muted).toBe(false)
      usePlayerStore.getState().toggleMute()
      expect(usePlayerStore.getState().muted).toBe(true)
    })
  })

  describe('persistence', () => {
    it('persists repeatMode alongside volume/muted, not the queue', () => {
      usePlayerStore.getState().cycleRepeatMode() // off -> all
      const partialize = usePlayerStore.persist.getOptions().partialize
      const persisted = partialize?.(usePlayerStore.getState())
      expect(persisted).toEqual({
        volume: 100,
        muted: false,
        repeatMode: 'all',
      })
    })
  })
})

describe('appendToQueue', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it('adds every track to the end of the queue', () => {
    usePlayerStore.getState().setQueue([track('a')], 0)
    usePlayerStore.getState().appendToQueue([track('b'), track('c')])
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(usePlayerStore.getState().currentIndex).toBe(0)
  })

  it('keeps the unshuffled order in sync so un-shuffling keeps them', () => {
    usePlayerStore.getState().setQueue([track('a'), track('b'), track('c')], 0)
    usePlayerStore.getState().toggleShuffle()
    usePlayerStore.getState().appendToQueue([track('x'), track('y')])
    usePlayerStore.getState().toggleShuffle()
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
      'a',
      'b',
      'c',
      'x',
      'y',
    ])
  })
})

describe('clearQueueExceptCurrent', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it('keeps only the playing track and does not restart it', () => {
    usePlayerStore.getState().setQueue([track('a'), track('b'), track('c')], 1)
    const nonce = usePlayerStore.getState().playNonce
    usePlayerStore.getState().clearQueueExceptCurrent()
    const state = usePlayerStore.getState()
    expect(state.queue.map((t) => t.id)).toEqual(['b'])
    expect(state.currentIndex).toBe(0)
    expect(state.playNonce).toBe(nonce)
  })

  it('drops the saved pre-shuffle order too, so un-shuffling cannot bring tracks back', () => {
    usePlayerStore.getState().setQueue([track('a'), track('b'), track('c')], 0)
    usePlayerStore.getState().toggleShuffle()
    usePlayerStore.getState().clearQueueExceptCurrent()
    usePlayerStore.getState().toggleShuffle()
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a'])
  })

  it('does nothing when no track is playing', () => {
    usePlayerStore.getState().clearQueueExceptCurrent()
    expect(usePlayerStore.getState().queue).toEqual([])
    expect(usePlayerStore.getState().currentIndex).toBe(-1)
  })
})
