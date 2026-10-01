import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { RouteFallback } from "@/components/layout/route-fallback"

const LibrariesPage = lazy(() => import("@/pages/admin/libraries-page"))

export const adminLibrariesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/libraries",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <LibrariesPage />
    </Suspense>
  ),
})
