import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const ArtistsPage = lazy(() => import("@/pages/artists-page"))

export const artistsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/artists",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <ArtistsPage />
    </Suspense>
  ),
})
