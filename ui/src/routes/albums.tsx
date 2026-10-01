import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const AlbumsPage = lazy(() => import("@/pages/albums-page"))

export const albumsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/albums",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <AlbumsPage />
    </Suspense>
  ),
})
