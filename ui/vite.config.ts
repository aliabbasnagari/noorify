import path from "node:path"
import { defineConfig, configDefaults } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA, type Display } from 'vite-plugin-pwa'

// Foreman (via `make dev`) starts this on PORT and the Go backend on PORT+100 —
// see Procfile.dev / Makefile's `dev` target.
const frontendPort = Number(process.env.PORT) || 4533
const backendPort = frontendPort + 100

export default defineConfig({
  plugins: [react(),
  tailwindcss(),
  VitePWA({
    manifest: manifest(),
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.js',
    injectManifest: {
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB
      // index.html is rendered per-user by the server, so a precached copy
      // would pin one user's config (and auth payload) across logins
      globIgnores: ['index.html'],
    },
    devOptions: {
      enabled: true,
    },
  }),],
  resolve: {
    // Mirrors tsconfig.app.json's "@/*" path (TS only type-checks it —
    // this is what makes the bundler/dev-server/test-runner resolve it).
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: frontendPort,
    proxy: {
      "^/(auth|api|rest|backgrounds)/.*": `http://localhost:${backendPort}`,
    },
  },
  // Served from an arbitrary sub-path behind a reverse proxy, so asset URLs
  // must stay relative rather than root-absolute.
  base: "./",
  build: {
    // Makefile's `buildjs` target keys off `ui/build/index.html`, and
    // embed.go embeds this directory into the Go binary — matching
    // old-ui's convention, not the Vite default `dist/`.
    outDir: "build",
    // Embedded into the Go binary (embed.go) — shipping full maps would add
    // ~6 MB and expose the source. `npm run build -- --sourcemap` to debug.
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
})



// PWA manifest
function manifest() {
  return {
    name: 'Navidrome',
    short_name: 'Navidrome',
    description: 'Navidrome, an open source web-based music collection server and streamer',
    categories: ['music', 'entertainment'],
    display: 'standalone' as Display,
    start_url: './',
    background_color: 'white',
    theme_color: 'blue',
    icons: [
      {
        src: './android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: './android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
