import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const SongsPage = lazy(() => import("@/pages/songs-page"))

export const songsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/songs",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <SongsPage />
    </Suspense>
  ),
})
