import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { RouteFallback } from "@/components/layout/route-fallback"

const PlayersPage = lazy(() => import("@/pages/admin/players-page"))

export const adminPlayersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/players",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <PlayersPage />
    </Suspense>
  ),
})
