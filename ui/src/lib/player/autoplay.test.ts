import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueuedTrack } from '@/stores/player-store'

vi.mock('@/lib/player/instant-mix', () => ({ fetchMixTracks: vi.fn() }))

import { fetchMixTracks } from '@/lib/player/instant-mix'
import { usePlayerStore } from '@/stores/player-store'
import { useSettingsStore } from '@/stores/settings-store'
import { needsAutoplayRefill, startAutoplay } from './autoplay'

function track(id: string, extra: Partial<QueuedTrack> = {}): QueuedTrack {
  return {
    id,
    title: `Track ${id}`,
    artist: 'Artist',
    albumId: 'al',
    albumTitle: 'Album',
    durationSeconds: 180,
    ...extra,
  }
}

/** Enough distinct tracks that one batch lifts the queue back above the
 * refill threshold — a smaller batch would (correctly) trigger another. */
const batch = (prefix: string) => [1, 2, 3].map((n) => track(`${prefix}${n}`))

const base = {
  autoplay: true,
  repeatMode: 'off' as const,
  queueLength: 5,
  currentIndex: 3,
  lastIsRadio: false,
}

describe('needsAutoplayRefill', () => {
  it('triggers at the threshold and past it', () => {
    expect(needsAutoplayRefill({ ...base, currentIndex: 1 })).toBe(false) // 3 left
    expect(needsAutoplayRefill({ ...base, currentIndex: 2 })).toBe(true) // 2 left
    expect(needsAutoplayRefill({ ...base, currentIndex: 4 })).toBe(true) // 0 left
  })

  it('stays off when disabled, repeating, empty, or on a radio station', () => {
    expect(needsAutoplayRefill({ ...base, autoplay: false })).toBe(false)
    expect(needsAutoplayRefill({ ...base, repeatMode: 'all' })).toBe(false)
    expect(needsAutoplayRefill({ ...base, repeatMode: 'one' })).toBe(false)
    expect(needsAutoplayRefill({ ...base, currentIndex: -1 })).toBe(false)
    expect(needsAutoplayRefill({ ...base, lastIsRadio: true })).toBe(false)
  })
})

describe('startAutoplay', () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    vi.resetAllMocks()
    useSettingsStore.setState({ autoplay: false })
    usePlayerStore.setState({
      queue: [],
      currentIndex: -1,
      repeatMode: 'off',
      shuffle: false,
      unshuffledQueue: null,
    })
  })

  afterEach(() => stop?.())

  it('does nothing while autoplay is off', async () => {
    usePlayerStore.getState().setQueue([track('a')], 0)
    stop = startAutoplay()
    expect(fetchMixTracks).not.toHaveBeenCalled()
  })

  it('appends similar tracks, marked as autoplay, seeded by the last track', async () => {
    vi.mocked(fetchMixTracks).mockResolvedValue([track('x'), track('y')])
    usePlayerStore.getState().setQueue([track('a'), track('b')], 0)
    useSettingsStore.setState({ autoplay: true })
    stop = startAutoplay()

    await vi.waitFor(() =>
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'a',
        'b',
        'x',
        'y',
      ]),
    )
    const [seedId, , exclude] = vi.mocked(fetchMixTracks).mock.calls[0]
    expect(seedId).toBe('b')
    expect([...(exclude as Set<string>)]).toEqual(['a', 'b'])
    expect(usePlayerStore.getState().queue.map((t) => t.autoplay)).toEqual([
      undefined,
      undefined,
      true,
      true,
    ])
  })

  it('kicks in when autoplay is switched on mid-queue', async () => {
    vi.mocked(fetchMixTracks).mockResolvedValue(batch('x'))
    usePlayerStore.getState().setQueue([track('a'), track('b')], 1)
    stop = startAutoplay()
    expect(fetchMixTracks).not.toHaveBeenCalled()
    useSettingsStore.getState().setAutoplay(true)
    await vi.waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(5),
    )
  })

  it('discards a batch when the queue changed while it was loading', async () => {
    let resolve!: (tracks: QueuedTrack[]) => void
    vi.mocked(fetchMixTracks).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    usePlayerStore.getState().setQueue([track('a')], 0)
    useSettingsStore.setState({ autoplay: true })
    stop = startAutoplay()
    usePlayerStore.getState().setQueue([track('new1')], 0)
    vi.mocked(fetchMixTracks).mockResolvedValue(batch('fresh'))
    resolve([track('stale')])
    // The discarded batch must not land, and the replacement queue — whose
    // own check was skipped while the first fetch was in flight — gets its
    // own refill.
    await vi.waitFor(() =>
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        'new1',
        'fresh1',
        'fresh2',
        'fresh3',
      ]),
    )
  })

  it('survives a failing fetch without retrying the same seed', async () => {
    vi.mocked(fetchMixTracks).mockRejectedValue(new Error('boom'))
    usePlayerStore.getState().setQueue([track('a')], 0)
    useSettingsStore.setState({ autoplay: true })
    stop = startAutoplay()
    await vi.waitFor(() => expect(fetchMixTracks).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 0))
    expect(fetchMixTracks).toHaveBeenCalledTimes(1)
  })

  it('does not retry a seed that produced nothing', async () => {
    vi.mocked(fetchMixTracks).mockResolvedValue([])
    usePlayerStore.getState().setQueue([track('a')], 0)
    useSettingsStore.setState({ autoplay: true })
    stop = startAutoplay()
    await vi.waitFor(() => expect(fetchMixTracks).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    // A state change that leaves the last track alone must not re-query.
    usePlayerStore.getState().setTelemetry({ currentTime: 5 })
    usePlayerStore.setState({ repeatMode: 'off', currentIndex: 0 })
    expect(fetchMixTracks).toHaveBeenCalledTimes(1)
  })

  it('leaves repeat-all queues alone', () => {
    useSettingsStore.setState({ autoplay: true })
    usePlayerStore.getState().setQueue([track('a')], 0)
    usePlayerStore.setState({ repeatMode: 'all' })
    stop = startAutoplay()
    expect(fetchMixTracks).not.toHaveBeenCalled()
  })
})
