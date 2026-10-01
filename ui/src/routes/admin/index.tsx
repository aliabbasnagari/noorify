import { createRoute, redirect } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"

export const adminIndexRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin",
  beforeLoad: () => {
    throw redirect({ to: "/admin/users" })
  },
})
