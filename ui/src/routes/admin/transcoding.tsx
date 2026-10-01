import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { RouteFallback } from "@/components/layout/route-fallback"

const TranscodingPage = lazy(() => import("@/pages/admin/transcoding-page"))

export const adminTranscodingRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/transcoding",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <TranscodingPage />
    </Suspense>
  ),
})
