import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Song } from '@/lib/api/types'

vi.mock('@/lib/api/subsonic', () => ({
  getSimilarSongs: vi.fn(),
  getRandomSongs: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { getRandomSongs, getSimilarSongs } from '@/lib/api/subsonic'
import { usePlayerStore } from '@/stores/player-store'
import { fetchMixTracks, playInstantMix } from './instant-mix'

function song(id: string, genre?: string): Song {
  return {
    id,
    title: `Song ${id}`,
    artist: 'Artist',
    artistId: 'ar1',
    albumId: 'al1',
    album: 'Album',
    duration: 200,
    starred: false,
    rating: 0,
    genre,
  }
}

describe('fetchMixTracks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getRandomSongs).mockResolvedValue([])
  })

  it('returns similar songs, skipping excluded ids and capping at count', async () => {
    vi.mocked(getSimilarSongs).mockResolvedValue([
      song('a'),
      song('b'),
      song('c'),
      song('d'),
    ])
    const tracks = await fetchMixTracks('seed', 2, new Set(['a']))
    expect(tracks.map((t) => t.id)).toEqual(['b', 'c'])
    expect(getRandomSongs).not.toHaveBeenCalled()
  })

  it('asks the server for extra to cover the excluded ids', async () => {
    vi.mocked(getSimilarSongs).mockResolvedValue([])
    await fetchMixTracks('seed', 10, new Set(['a', 'b', 'c']))
    expect(getSimilarSongs).toHaveBeenCalledWith('seed', 13)
  })

  it('drops duplicates within the result', async () => {
    vi.mocked(getSimilarSongs).mockResolvedValue([song('a'), song('a')])
    const tracks = await fetchMixTracks('seed', 5, new Set())
    expect(tracks).toHaveLength(1)
  })

  it('falls back to the seed genre when similar songs fail', async () => {
    vi.mocked(getSimilarSongs).mockRejectedValue(new Error('boom'))
    vi.mocked(getRandomSongs).mockResolvedValueOnce([song('g1', 'Jazz')])
    const tracks = await fetchMixTracks('seed', 5, new Set(), 'Jazz')
    expect(tracks.map((t) => t.id)).toEqual(['g1'])
    expect(getRandomSongs).toHaveBeenCalledWith({ size: 5, genre: 'Jazz' })
  })

  it('falls back to a plain random sample when nothing else works', async () => {
    vi.mocked(getSimilarSongs).mockResolvedValue([])
    vi.mocked(getRandomSongs)
      .mockResolvedValueOnce([]) // genre sample comes back empty
      .mockResolvedValueOnce([song('r1')])
    const tracks = await fetchMixTracks('seed', 5, new Set(), 'Jazz')
    expect(tracks.map((t) => t.id)).toEqual(['r1'])
    expect(getRandomSongs).toHaveBeenLastCalledWith({ size: 5 })
  })

  it('returns nothing when every source is empty', async () => {
    vi.mocked(getSimilarSongs).mockResolvedValue([])
    expect(await fetchMixTracks('seed', 5, new Set())).toEqual([])
  })
})

describe('playInstantMix', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getRandomSongs).mockResolvedValue([])
    usePlayerStore.setState({ queue: [], currentIndex: -1 })
  })

  it('starts the seed song first, followed by the mix without a repeat of it', async () => {
    const seed = song('seed', 'Rock')
    vi.mocked(getSimilarSongs).mockResolvedValue([song('x'), seed, song('y')])
    await playInstantMix('seed', seed)
    const { queue, currentIndex } = usePlayerStore.getState()
    expect(queue.map((t) => t.id)).toEqual(['seed', 'x', 'y'])
    expect(currentIndex).toBe(0)
  })

  it('plays an album/artist mix from its first track', async () => {
    vi.mocked(getSimilarSongs).mockResolvedValue([song('x'), song('y')])
    await playInstantMix('album-1')
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['x', 'y'])
  })

  it('leaves the current queue alone when no mix can be built', async () => {
    usePlayerStore.getState().setQueue(
      [
        {
          id: 'keep',
          title: 'Keep',
          artist: 'A',
          albumId: 'al',
          albumTitle: 'Al',
          durationSeconds: 1,
        },
      ],
      0,
    )
    vi.mocked(getSimilarSongs).mockResolvedValue([])
    await playInstantMix('album-1')
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['keep'])
  })
})
