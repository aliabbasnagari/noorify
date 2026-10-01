import { useEffect, useState } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "@tanstack/react-router"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import { queryClient } from "@/lib/query/query-client"
import { initEventStream } from "@/lib/realtime/event-stream"
import {
  bootstrapAuthFromServerConfig,
  useAuthStore,
} from "@/stores/auth-store"
import { router } from "@/router"
import "@/i18n"
import "@/lib/player/audio-engine"

// Runs before the router's first beforeLoad check (not in an effect, which
// would run after that first check and cause a login-page flash for
// reverse-proxy trusted-header sessions).
bootstrapAuthFromServerConfig()

function App() {
  // zustand's `persist` middleware hydrates from localStorage
  // asynchronously — without this gate, a hard reload/deep-link on a
  // protected route races the `_authenticated` route's beforeLoad guard,
  // which reads the store *before* the persisted session loads and bounces
  // a genuinely logged-in user to /login.
  const [authHydrated, setAuthHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  )

  // Passive effects run after paint, well after the synchronous useState
  // initializer above — hydration can finish in that gap, and subscribing
  // after it already fired would mean onFinishHydration's callback never
  // runs. Catch that case synchronously during render (same pattern as
  // StarButton/RatingStars's optimistic-reset), not in the effect below,
  // which exists only to register the subscription for the case where
  // hydration is still pending.
  if (!authHydrated && useAuthStore.persist.hasHydrated()) {
    setAuthHydrated(true)
  }

  useEffect(() => {
    if (authHydrated) return
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true))
  }, [authHydrated])

  useEffect(() => {
    initEventStream()
  }, [])

  if (!authHydrated) return null

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
      {import.meta.env.DEV && (
        <ReactQueryDevtools buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}

export default App
