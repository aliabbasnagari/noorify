import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const AlbumDetailPage = lazy(() => import("@/pages/album-detail-page"))

export const albumDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/album/$albumId",
  component: AlbumDetailRouteComponent,
})

function AlbumDetailRouteComponent() {
  const { albumId } = albumDetailRoute.useParams()
  return (
    <Suspense fallback={<RouteFallback />}>
      <AlbumDetailPage albumId={albumId} />
    </Suspense>
  )
}
