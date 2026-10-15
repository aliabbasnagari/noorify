import { lazy, Suspense } from 'react'
import { createRoute } from '@tanstack/react-router'
import { authenticatedRoute } from '@/routes/authenticated'
import { RouteFallback } from '@/components/layout/route-fallback'

const ShelfPage = lazy(() => import('@/pages/shelf-page'))

export const shelfRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/shelf/$shelfId',
  component: ShelfRouteComponent,
})

function ShelfRouteComponent() {
  const { shelfId } = shelfRoute.useParams()
  return (
    <Suspense fallback={<RouteFallback />}>
      <ShelfPage shelfId={shelfId} />
    </Suspense>
  )
}
