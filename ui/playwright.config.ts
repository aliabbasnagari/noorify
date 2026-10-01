import { defineConfig, devices } from "@playwright/test"

// Critical-path e2e specs. Specs that need a real navidrome backend are
// skipped unless E2E_BASE_URL points at one (see e2e/README.md, added when
// Phase 1 needs a live server); specs that only need the static app (e.g.
// the login page) run against a `vite preview` server in CI.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:4533",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run preview -- --port 4533",
        url: "http://localhost:4533",
        reuseExistingServer: !process.env.CI,
      },
})
