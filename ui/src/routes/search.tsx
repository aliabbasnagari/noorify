import { lazy, Suspense } from 'react'
import { createRoute } from '@tanstack/react-router'
import { authenticatedRoute } from '@/routes/authenticated'
import { RouteFallback } from '@/components/layout/route-fallback'

const SearchPage = lazy(() => import('@/pages/search-page'))

export const SEARCH_CATEGORIES = [
  'all',
  'songs',
  'artists',
  'albums',
  'playlists',
] as const

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number]

export interface SearchRouteSearch {
  q: string
  category: SearchCategory
}

export const searchRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/search',
  // Query + category filter live in the URL (not just component state) so a
  // refresh, a shared link, or browser back/forward all land back on the
  // same results instead of a blank search page.
  validateSearch: (search: Record<string, unknown>): SearchRouteSearch => ({
    q: typeof search.q === 'string' ? search.q : '',
    category: SEARCH_CATEGORIES.includes(search.category as SearchCategory)
      ? (search.category as SearchCategory)
      : 'all',
  }),
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <SearchPage />
    </Suspense>
  ),
})
