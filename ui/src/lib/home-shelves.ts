import type { ListParams } from '@/lib/api/http'

export interface HomeShelf {
  id: string
  titleKey: string
  params: ListParams
}

// Same sort/filter combos old-ui's albumLists.jsx used (confirmed against
// the server's actual filter/sort vocabulary) — "all" is skipped here since
// that's just the /albums page, not a Home shelf. Shared by the Home page
// (first row of each) and the "Show all" page (the full list).
export const HOME_SHELVES: HomeShelf[] = [
  {
    id: 'recently-added',
    titleKey: 'home.recentlyAdded',
    params: { sort: 'recently_added', order: 'DESC' },
  },
  {
    id: 'recently-played',
    titleKey: 'home.recentlyPlayed',
    params: {
      sort: 'play_date',
      order: 'DESC',
      filter: { recently_played: true },
    },
  },
  {
    id: 'most-played',
    titleKey: 'home.mostPlayed',
    params: {
      sort: 'play_count',
      order: 'DESC',
      filter: { recently_played: true },
    },
  },
  {
    id: 'favorites',
    titleKey: 'home.favorites',
    params: { sort: 'starred_at', order: 'DESC', filter: { starred: true } },
  },
  {
    id: 'top-rated',
    titleKey: 'home.topRated',
    params: { sort: 'rating', order: 'DESC', filter: { has_rating: true } },
  },
  { id: 'random', titleKey: 'home.randomPicks', params: { sort: 'random' } },
]

export function findHomeShelf(id: string): HomeShelf | undefined {
  return HOME_SHELVES.find((shelf) => shelf.id === id)
}
