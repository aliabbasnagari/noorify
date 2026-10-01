import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { RouteFallback } from "@/components/layout/route-fallback"

const PluginDetailPage = lazy(() => import("@/pages/admin/plugin-detail-page"))

export const adminPluginDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/plugins/$pluginId",
  component: PluginDetailRouteComponent,
})

function PluginDetailRouteComponent() {
  const { pluginId } = adminPluginDetailRoute.useParams()
  return (
    <Suspense fallback={<RouteFallback />}>
      <PluginDetailPage pluginId={pluginId} />
    </Suspense>
  )
}
