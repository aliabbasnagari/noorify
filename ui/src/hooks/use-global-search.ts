import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getList } from '@/lib/api/http'
import { search3 } from '@/lib/api/subsonic'
import type { Playlist } from '@/lib/api/types'

export interface SearchCounts {
  artistCount?: number
  artistOffset?: number
  albumCount?: number
  albumOffset?: number
  songCount?: number
  songOffset?: number
  playlistCount?: number
  playlistOffset?: number
}

function searchPlaylists(query: string, count: number, offset: number) {
  return getList<Playlist>('playlist', {
    filter: { q: query },
    start: offset,
    end: offset + count,
  })
}

/**
 * Shared by the topbar's live suggestions and the full search results page
 * so both read through the same cache instead of duplicating the
 * search3+playlist-filter fan-out. `counts` (including the `*Offset` fields)
 * is part of the query key, so the topbar's small suggestion counts and the
 * results page's larger/paginated counts are cached independently.
 */
export function useGlobalSearch(query: string, counts: SearchCounts = {}) {
  return useQuery({
    queryKey: ['search', query, counts],
    queryFn: async () => {
      // A category tab for a non-playlist entity passes playlistCount: 0 —
      // skip the extra native-REST round trip entirely rather than asking
      // for a zero-length page.
      const wantsPlaylists = counts.playlistCount !== 0
      const [subsonic, playlists] = await Promise.all([
        search3(query, counts),
        wantsPlaylists
          ? searchPlaylists(
              query,
              counts.playlistCount ?? 10,
              counts.playlistOffset ?? 0,
            )
          : Promise.resolve({ data: [] as Playlist[], total: 0 }),
      ])
      return {
        artists: subsonic.artists,
        albums: subsonic.albums,
        songs: subsonic.songs,
        playlists: playlists.data,
        playlistsTotal: playlists.total,
      }
    },
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  })
}
