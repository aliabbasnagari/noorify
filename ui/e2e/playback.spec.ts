import { test, expect, type Page, type Locator } from "@playwright/test"

// No live navidrome backend is available for this repo's e2e run, so this
// test mocks the native-REST and Subsonic endpoints at the network layer
// and serves a real (tiny, silent) WAV file for `stream` — real enough for
// Chromium to actually decode and play, so playback state reflects genuine
// audio decoding, not just UI state we asserted by hand.

const FAKE_SESSION = {
  token: "fake-jwt-token",
  id: "u1",
  name: "Test User",
  username: "testuser",
  isAdmin: false,
  subsonicSalt: "salt",
  subsonicToken: "token",
}

const FAKE_SONGS = [
  {
    id: "song-1",
    title: "First Song",
    artist: "Artist One",
    albumId: "album-1",
    album: "Album One",
    duration: 210,
  },
  {
    id: "song-2",
    title: "Second Song",
    artist: "Artist Two",
    albumId: "album-2",
    album: "Album Two",
    duration: 180,
  },
]

const FAKE_ALBUM = {
  id: "album-1",
  name: "Test Album",
  artist: "Artist One",
  artistId: "artist-1",
  songCount: 2,
  duration: 390,
  year: 2020,
  starred: false,
  rating: 0,
}

function createSilentWav(durationSeconds: number, sampleRate = 8000): Buffer {
  const numSamples = Math.floor(durationSeconds * sampleRate)
  const dataSize = numSamples * 2 // 16-bit mono PCM
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)
  // PCM samples are left at 0 (silence) by Buffer.alloc.
  return buffer
}

async function mockBackend(page: Page, clipSeconds: number) {
  await page.route("**/auth/login", (route) => route.fulfill({ json: FAKE_SESSION }))
  // Home renders shelves from /api/album — every shelf query gets the same
  // one-album response, which is all these tests need to get a "Play"
  // button on the page and a real song list behind it.
  await page.route("**/api/album**", (route) =>
    route.fulfill({ headers: { "X-Total-Count": "1" }, json: [FAKE_ALBUM] }),
  )
  await page.route("**/api/song**", (route) => route.fulfill({ json: FAKE_SONGS }))
  await page.route("**/rest/scrobble**", (route) =>
    route.fulfill({ json: { "subsonic-response": { status: "ok" } } }),
  )
  await page.route("**/rest/stream**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: createSilentWav(clipSeconds),
    }),
  )
}

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("Username").fill("testuser")
  await page.getByLabel("Password").fill("password")
  await page.getByRole("button", { name: /log in/i }).click()
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible()
}

function playerBarOf(page: Page): Locator {
  return page.locator('[data-slot="player-bar"]')
}

test("logs in, loads a sample track, and actually plays it", async ({ page }) => {
  await mockBackend(page, 30)
  await login(page)

  await expect(page.getByText("Test Album").first()).toBeVisible()
  await page.getByRole("button", { name: "Play Test Album" }).first().click()

  const playerBar = playerBarOf(page)
  await expect(playerBar.getByText("First Song")).toBeVisible()
  await expect(playerBar.getByRole("button", { name: "Pause" })).toBeVisible()

  // Genuine playback, not just UI state: MediaSession metadata is only set
  // from inside the engine's loadCurrentTrack, and the seek slider's
  // aria-valuenow only advances if the browser actually decoded and
  // started the WAV (it's driven by the real `timeupdate` event).
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession.metadata?.title))
    .toBe("First Song")
  await expect
    .poll(async () =>
      Number(
        await playerBar.getByRole("slider", { name: "Seek" }).getAttribute("aria-valuenow"),
      ),
    )
    .toBeGreaterThan(0)
})

test("auto-advances to the next track when one ends", async ({ page }) => {
  await mockBackend(page, 0.3)
  await login(page)
  const playerBar = playerBarOf(page)

  await expect(page.getByText("Test Album").first()).toBeVisible()
  await page.getByRole("button", { name: "Play Test Album" }).first().click()
  await expect(playerBar.getByText("First Song")).toBeVisible()

  await expect(playerBar.getByText("Second Song")).toBeVisible({ timeout: 5000 })
})

test("play/pause, next, and previous transport controls work", async ({ page }) => {
  await mockBackend(page, 30)
  await login(page)
  const playerBar = playerBarOf(page)

  await expect(page.getByText("Test Album").first()).toBeVisible()
  await page.getByRole("button", { name: "Play Test Album" }).first().click()
  await expect(playerBar.getByRole("button", { name: "Pause" })).toBeVisible()

  await playerBar.getByRole("button", { name: "Pause" }).click()
  await expect(playerBar.getByRole("button", { name: "Play" })).toBeVisible()

  await playerBar.getByRole("button", { name: "Play" }).click()
  await playerBar.getByRole("button", { name: "Next" }).click()
  await expect(playerBar.getByText("Second Song")).toBeVisible()

  await playerBar.getByRole("button", { name: "Previous" }).click()
  await expect(playerBar.getByText("First Song")).toBeVisible()
})
