import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const SmartPlaylistEditorPage = lazy(
  () => import("@/pages/smart-playlist-editor-page"),
)

export const smartPlaylistEditRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/playlist/$playlistId/rules",
  component: SmartPlaylistEditRouteComponent,
})

function SmartPlaylistEditRouteComponent() {
  const { playlistId } = smartPlaylistEditRoute.useParams()
  return (
    <Suspense fallback={<RouteFallback />}>
      <SmartPlaylistEditorPage playlistId={playlistId} />
    </Suspense>
  )
}
