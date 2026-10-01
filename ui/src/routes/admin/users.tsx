import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { RouteFallback } from "@/components/layout/route-fallback"

const UsersPage = lazy(() => import("@/pages/admin/users-page"))

export const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/users",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <UsersPage />
    </Suspense>
  ),
})
