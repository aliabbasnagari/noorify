import { createRoute, Outlet, redirect } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { isAuthenticated } from "@/stores/auth-store"
import { useAuthStore } from "@/stores/auth-store"
import { AdminShell } from "@/components/admin/admin-shell"

// Pathless layout, same pattern as `_authenticated`: every /admin/* screen
// is a child of this route, so the admin-only guard and the AdminShell nav
// live in exactly one place. Non-admins are bounced to "/" rather than
// shown a section where 3 of its 4 resources (Users/Libraries/Transcoding)
// would 403 on every request anyway — only Players is reachable by a
// regular user server-side, and that's not worth a whole nav section for.
export const adminLayoutRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: "_admin",
  beforeLoad: () => {
    if (!isAuthenticated() || !useAuthStore.getState().session?.isAdmin) {
      throw redirect({ to: "/" })
    }
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
})
