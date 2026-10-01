import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/admin/layout"
import { RouteFallback } from "@/components/layout/route-fallback"

const MissingFilesPage = lazy(() => import("@/pages/admin/missing-files-page"))

export const adminMissingFilesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/missing-files",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <MissingFilesPage />
    </Suspense>
  ),
})
