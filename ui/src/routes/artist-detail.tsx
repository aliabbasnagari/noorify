import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const ArtistDetailPage = lazy(() => import("@/pages/artist-detail-page"))

export const artistDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/artist/$artistId",
  component: ArtistDetailRouteComponent,
})

function ArtistDetailRouteComponent() {
  const { artistId } = artistDetailRoute.useParams()
  return (
    <Suspense fallback={<RouteFallback />}>
      <ArtistDetailPage artistId={artistId} />
    </Suspense>
  )
}
