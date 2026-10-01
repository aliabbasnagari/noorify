import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const LibraryPage = lazy(() => import("@/pages/library-page"))

export const libraryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/library",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <LibraryPage />
    </Suspense>
  ),
})
