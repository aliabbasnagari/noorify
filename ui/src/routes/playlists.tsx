import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const PlaylistsPage = lazy(() => import("@/pages/playlists-page"))

export const playlistsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/playlists",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <PlaylistsPage />
    </Suspense>
  ),
})
