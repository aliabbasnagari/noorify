import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const PlaylistDetailPage = lazy(() => import("@/pages/playlist-detail-page"))

export const playlistDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/playlist/$playlistId",
  component: PlaylistDetailRouteComponent,
})

function PlaylistDetailRouteComponent() {
  const { playlistId } = playlistDetailRoute.useParams()
  return (
    <Suspense fallback={<RouteFallback />}>
      <PlaylistDetailPage playlistId={playlistId} />
    </Suspense>
  )
}
