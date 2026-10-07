import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const SmartPlaylistEditorPage = lazy(
  () => import("@/pages/smart-playlist-editor-page"),
)

export const smartPlaylistNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/playlists/smart/new",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <SmartPlaylistEditorPage />
    </Suspense>
  ),
})
