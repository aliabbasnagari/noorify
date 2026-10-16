import { createRoute, redirect } from '@tanstack/react-router'
import { authenticatedRoute } from '@/routes/authenticated'
import { consumeDefaultViewRedirect } from '@/lib/default-view'
import { useSettingsStore } from '@/stores/settings-store'
import HomePage from '@/pages/home-page'

export const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  // Personal → "Default view": the first visit to "/" in a session goes to
  // the chosen page; later visits (the sidebar's Home link) stay on Home.
  beforeLoad: () => {
    const target = consumeDefaultViewRedirect(
      useSettingsStore.getState().defaultView,
    )
    if (target) throw redirect(target)
  },
  component: HomePage,
})
