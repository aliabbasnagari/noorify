import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { RouteFallback } from "@/components/layout/route-fallback"

const PluginsPage = lazy(() => import("@/pages/admin/plugins-page"))

export const adminPluginsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/plugins",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <PluginsPage />
    </Suspense>
  ),
})
