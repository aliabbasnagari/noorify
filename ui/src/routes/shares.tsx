import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const SharesPage = lazy(() => import("@/pages/shares-page"))

export const sharesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/shares",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <SharesPage />
    </Suspense>
  ),
})
