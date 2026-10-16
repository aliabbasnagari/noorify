import { lazy, Suspense } from 'react'
import { createRoute } from '@tanstack/react-router'
import { authenticatedRoute } from '@/routes/authenticated'
import { RouteFallback } from '@/components/layout/route-fallback'

const PersonalPage = lazy(() => import('@/pages/personal-page'))

export const personalRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/personal',
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <PersonalPage />
    </Suspense>
  ),
})
