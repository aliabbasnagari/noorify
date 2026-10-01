import { createRoute, redirect, Outlet } from "@tanstack/react-router"
import { rootRoute } from "@/routes/root"
import { isAuthenticated } from "@/stores/auth-store"
import { AppShell } from "@/components/layout/app-shell"

// Pathless layout route (TanStack Router convention: id starts with `_`).
// Every protected screen is a child of this route, so the auth guard and
// the app shell (sidebar/topbar/player-bar) live in exactly one place.
export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      })
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
