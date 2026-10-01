import { lazy, Suspense } from "react"
import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import { RouteFallback } from "@/components/layout/route-fallback"

const RadioPage = lazy(() => import("@/pages/radio-page"))

export const radioRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/radio",
  component: () => (
    <Suspense fallback={<RouteFallback />}>
      <RadioPage />
    </Suspense>
  ),
})
