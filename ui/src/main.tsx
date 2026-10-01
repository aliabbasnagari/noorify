import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from 'virtual:pwa-register'

import "./index.css"
import App from "./App.tsx"
import SharePlayerPage from "./pages/share-player-page.tsx"
import { ThemeProvider } from "./components/theme-provider.tsx"
import { shareInfo } from "./lib/config.ts"

declare global { interface Window { global: typeof globalThis } }

window.global = window // fix "global is not defined" error in react-image-lightbox


registerSW({ immediate: true })

// A public `/share/{id}` page load injects window.__SHARE_INFO__ (see
// server/serve_index.go) and is served completely outside the
// authenticated app: no router, no auth store, no sidebar/player-bar
// shell — see share-player-page.tsx's doc comment for why.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {shareInfo ? (
      <ThemeProvider>
        <SharePlayerPage info={shareInfo} />
      </ThemeProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
