import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const SearchPage = lazy(() => import("@/pages/search-page"))

export const searchRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/search",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <SearchPage />
    </Suspense>
  ),
})
