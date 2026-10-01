import { test, expect, type Page } from "@playwright/test"

// Validates the Phase 2 virtualization spike against a large (300-row)
// mocked library, with a real `_start`/`_end`-paginated route handler — not
// a single static response — so scrolling has to actually trigger more
// network requests, the same way it would against a real backend. jsdom
// can't do this (no real layout/scroll), which is why this lives in e2e
// rather than a component test (see virtualized-grid.test.tsx).

const FAKE_SESSION = {
  token: "fake-jwt-token",
  id: "u1",
  name: "Test User",
  username: "testuser",
  isAdmin: false,
  subsonicSalt: "salt",
  subsonicToken: "token",
}

function generateAlbums(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `album-${i}`,
    name: `Album ${i}`,
    artist: `Artist ${i % 20}`,
    artistId: `artist-${i % 20}`,
    songCount: 10,
    duration: 2000,
    year: 2000 + (i % 25),
    starred: false,
    rating: 0,
  }))
}

const ALL_ALBUMS = generateAlbums(300)

async function mockBackend(page: Page) {
  await page.route("**/auth/login", (route) => route.fulfill({ json: FAKE_SESSION }))

  await page.route("**/api/album**", (route) => {
    const url = new URL(route.request().url())
    const start = Number(url.searchParams.get("_start") ?? "0")
    const end = Number(url.searchParams.get("_end") ?? String(ALL_ALBUMS.length))
    route.fulfill({
      headers: { "X-Total-Count": String(ALL_ALBUMS.length) },
      json: ALL_ALBUMS.slice(start, end),
    })
  })

  await page.route("**/api/song**", (route) => route.fulfill({ json: [] }))
  await page.route("**/rest/getCoverArt**", (route) => route.fulfill({ status: 404, body: "" }))
}

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("Username").fill("testuser")
  await page.getByLabel("Password").fill("password")
  await page.getByRole("button", { name: /log in/i }).click()
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible()
}

test("Albums grid only renders a windowed subset of a large library", async ({ page }) => {
  await mockBackend(page)
  await login(page)

  await page.getByRole("link", { name: "Albums" }).click()
  await expect(page.getByRole("heading", { name: "Albums" })).toBeVisible()
  await expect(page.getByText("Album 0")).toBeVisible()

  const cardCount = await page.locator('[data-slot="album-card"]').count()
  expect(cardCount).toBeGreaterThan(0)
  expect(cardCount).toBeLessThan(ALL_ALBUMS.length)

  // Far-down rows shouldn't exist in the DOM yet — proves it's windowed,
  // not just visually clipped with overflow.
  await expect(page.getByText("Album 250", { exact: true })).not.toBeAttached()
})

test("scrolling the Albums grid loads and renders further pages", async ({ page }) => {
  await mockBackend(page)
  await login(page)

  await page.getByRole("link", { name: "Albums" }).click()
  await expect(page.getByText("Album 0")).toBeVisible()

  const scrollContainer = page.locator('[data-slot="virtualized-grid"]')
  await scrollContainer.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })

  await expect(page.getByText(`Album ${ALL_ALBUMS.length - 1}`)).toBeVisible({
    timeout: 5000,
  })
})

test("switching to list view renders compact rows instead of cards", async ({ page }) => {
  await mockBackend(page)
  await login(page)

  await page.getByRole("link", { name: "Albums" }).click()
  await expect(page.getByText("Album 0")).toBeVisible()
  await expect(page.locator('[data-slot="album-card"]').first()).toBeVisible()

  await page.getByRole("button", { name: "List view" }).click()
  await expect(page.locator('[data-slot="album-card"]')).toHaveCount(0)
  await expect(page.getByText("Album 0")).toBeVisible()
})

test("Home shows real album shelves from the backend", async ({ page }) => {
  await mockBackend(page)
  await login(page)

  await expect(page.getByRole("heading", { name: "Recently Added" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Random Picks" })).toBeVisible()
})
