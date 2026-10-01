import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const NowPlayingPage = lazy(() => import("@/pages/now-playing-page"))

export const nowPlayingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/now-playing",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <NowPlayingPage />
    </Suspense>
  ),
})
