import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getLyricsBySongId,
  getRandomSongs,
  getSimilarSongs,
  search3,
  subsonicFetch,
} from './subsonic'
import type { SubsonicStructuredLyric } from '@/lib/api/types'

function mockLyricsResponse(structuredLyrics: SubsonicStructuredLyric[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          'subsonic-response': {
            status: 'ok',
            lyricsList: { structuredLyrics },
          },
        }),
    }),
  )
}

describe('search3', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            'subsonic-response': {
              status: 'ok',
              searchResult3: {
                artist: [
                  {
                    id: 'ar1',
                    name: 'Some Artist',
                    albumCount: 3,
                    userRating: 4,
                  },
                ],
                album: [
                  {
                    id: 'al1',
                    name: 'Some Album',
                    artist: 'Some Artist',
                    artistId: 'ar1',
                    songCount: 10,
                    duration: 2000,
                    year: 2020,
                    starred: '2024-01-01T00:00:00Z',
                  },
                ],
                song: [
                  {
                    id: 'sg1',
                    title: 'Some Song',
                    album: 'Some Album',
                    albumId: 'al1',
                    artist: 'Some Artist',
                    artistId: 'ar1',
                    track: 3,
                    duration: 200,
                  },
                ],
              },
            },
          }),
      }),
    )
  })

  it('normalizes ID3 search results into the native REST Artist/Album/Song shapes', async () => {
    const result = await search3('some query')

    expect(result.artists).toEqual([
      {
        id: 'ar1',
        name: 'Some Artist',
        albumCount: 3,
        starred: false,
        rating: 4,
      },
    ])
    expect(result.albums).toEqual([
      {
        id: 'al1',
        name: 'Some Album',
        albumArtist: 'Some Artist',
        albumArtistId: 'ar1',
        songCount: 10,
        duration: 2000,
        maxYear: 2020,
        starred: true,
        rating: 0,
      },
    ])
    expect(result.songs).toEqual([
      {
        id: 'sg1',
        title: 'Some Song',
        artist: 'Some Artist',
        artistId: 'ar1',
        albumId: 'al1',
        album: 'Some Album',
        duration: 200,
        trackNumber: 3,
        discNumber: undefined,
        starred: false,
        rating: 0,
      },
    ])
  })

  it('returns empty arrays when a category has no matches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            'subsonic-response': { status: 'ok', searchResult3: {} },
          }),
      }),
    )
    const result = await search3('nothing matches this')
    expect(result).toEqual({ artists: [], albums: [], songs: [] })
  })
})

describe('getLyricsBySongId', () => {
  it('prefers a synced, main-kind entry over an unsynced fallback', async () => {
    mockLyricsResponse([
      { lang: 'xxx', line: [{ value: 'unsynced line' }], synced: false },
      {
        lang: 'eng',
        kind: 'main',
        line: [{ start: 1000, value: 'synced line' }],
        synced: true,
      },
    ])
    const lyric = await getLyricsBySongId('song1')
    expect(lyric?.synced).toBe(true)
    expect(lyric?.line[0].value).toBe('synced line')
  })

  it('skips a synced translation in favor of the synced main entry', async () => {
    mockLyricsResponse([
      {
        lang: 'fra',
        kind: 'translation',
        line: [{ start: 1000, value: 'ligne synchronisée' }],
        synced: true,
      },
      {
        lang: 'eng',
        line: [{ start: 1000, value: 'synced main line' }],
        synced: true,
      },
    ])
    const lyric = await getLyricsBySongId('song1')
    expect(lyric?.line[0].value).toBe('synced main line')
  })

  it('falls back to the first main-kind entry when nothing is synced', async () => {
    mockLyricsResponse([
      { lang: 'eng', line: [{ value: 'only unsynced line' }], synced: false },
    ])
    const lyric = await getLyricsBySongId('song1')
    expect(lyric?.synced).toBe(false)
    expect(lyric?.line[0].value).toBe('only unsynced line')
  })

  it('returns null when the song has no lyrics at all', async () => {
    mockLyricsResponse([])
    const lyric = await getLyricsBySongId('song1')
    expect(lyric).toBeNull()
  })
})

describe('subsonicFetch error handling', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('throws on a non-OK HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 502, json: vi.fn() }),
    )
    await expect(subsonicFetch('ping')).rejects.toThrow(/HTTP 502/)
  })

  it('throws a clear error on a non-JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      }),
    )
    await expect(subsonicFetch('ping')).rejects.toThrow(/invalid response/)
  })

  it('throws on a failed envelope and signs out on auth error codes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            'subsonic-response': {
              status: 'failed',
              error: { code: 40, message: 'Wrong username or password' },
            },
          }),
      }),
    )
    await expect(subsonicFetch('ping')).rejects.toThrow(
      'Wrong username or password',
    )
    expect(window.location.hash).toBe('#/login')
  })

  it('does not sign out on a non-auth failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            'subsonic-response': {
              status: 'failed',
              error: { code: 70, message: 'Not found' },
            },
          }),
      }),
    )
    await expect(subsonicFetch('ping')).rejects.toThrow('Not found')
    expect(window.location.hash).not.toBe('#/login')
  })
})

describe('getSimilarSongs / getRandomSongs', () => {
  function stubSongs(body: Record<string, unknown>) {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ 'subsonic-response': { status: 'ok', ...body } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('maps similar songs, keeping genre and year', async () => {
    const fetchMock = stubSongs({
      similarSongs2: {
        song: [
          { id: 's1', title: 'One', artist: 'A', genre: 'Jazz', year: 1999 },
        ],
      },
    })
    const songs = await getSimilarSongs('al-1', 30)
    expect(songs).toHaveLength(1)
    expect(songs[0]).toMatchObject({ id: 's1', genre: 'Jazz', year: 1999 })
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://x')
    expect(url.pathname).toMatch(/getSimilarSongs2$/)
    expect(url.searchParams.get('id')).toBe('al-1')
    expect(url.searchParams.get('count')).toBe('30')
  })

  it('treats a missing song list as empty', async () => {
    stubSongs({ similarSongs2: {} })
    expect(await getSimilarSongs('x')).toEqual([])
  })

  it('only sends the random-song filters that are set', async () => {
    const fetchMock = stubSongs({ randomSongs: { song: [] } })
    await getRandomSongs({ size: 10, genre: 'Rock' })
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://x')
    expect(url.searchParams.get('size')).toBe('10')
    expect(url.searchParams.get('genre')).toBe('Rock')
    expect(url.searchParams.has('fromYear')).toBe(false)
    expect(url.searchParams.has('toYear')).toBe(false)
  })
})
