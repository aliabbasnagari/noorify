import { createRoute } from "@tanstack/react-router"
import { authenticatedRoute } from "@/routes/authenticated"
import HomePage from "@/pages/home-page"

export const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: HomePage,
})
