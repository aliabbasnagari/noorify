import zlib from "node:zlib"
import { test, expect, type Page } from "@playwright/test"

// Covers Phase 3's actual DoD: "full navigation loop (Home -> Album/Artist/
// Playlist -> play) works with no dead ends" and "gradient hero doesn't
// jank on navigation" — plus the playlist drag-reorder interaction, which
// (like Phase 1's audio and Phase 2's virtualization) needs a real browser:
// jsdom has no real pointer/layout for dnd-kit, and no real canvas for the
// color-extraction spike, so those aren't meaningfully unit-testable.

const FAKE_SESSION = {
  token: "fake-jwt-token",
  id: "u1",
  name: "Test User",
  username: "testuser",
  isAdmin: false,
  subsonicSalt: "salt",
  subsonicToken: "token",
}

const FAKE_ALBUM = {
  id: "album-1",
  name: "Test Album",
  albumArtist: "Test Artist",
  albumArtistId: "artist-1",
  songCount: 2,
  duration: 390,
  maxYear: 2020,
  starred: false,
  rating: 0,
}

const FAKE_ARTIST = {
  id: "artist-1",
  name: "Test Artist",
  albumCount: 1,
  biography: "A short biography of Test Artist, for the About section.",
  starred: false,
  rating: 0,
}

const FAKE_SONGS = [
  {
    id: "song-1",
    title: "Track One",
    artist: "Test Artist",
    artistId: "artist-1",
    albumId: "album-1",
    album: "Test Album",
    duration: 200,
    trackNumber: 1,
    discNumber: 1,
    starred: false,
    rating: 0,
  },
  {
    id: "song-2",
    title: "Track Two",
    artist: "Test Artist",
    artistId: "artist-1",
    albumId: "album-1",
    album: "Test Album",
    duration: 190,
    trackNumber: 2,
    discNumber: 1,
    starred: false,
    rating: 0,
  },
]

const FAKE_PLAYLIST = {
  id: "1",
  name: "My Mix",
  comment: "",
  songCount: 3,
  duration: 600,
  ownerName: "testuser",
  public: false,
  sync: false,
  rules: null,
}

let fakePlaylistTracks = [
  { id: "1", mediaFileId: "song-1", playlistId: "1", title: "Track One", artist: "Test Artist", artistId: "artist-1", albumId: "album-1", album: "Test Album", duration: 200, starred: false, rating: 0 },
  { id: "2", mediaFileId: "song-2", playlistId: "1", title: "Track Two", artist: "Test Artist", artistId: "artist-1", albumId: "album-1", album: "Test Album", duration: 190, starred: false, rating: 0 },
  { id: "3", mediaFileId: "song-3", playlistId: "1", title: "Track Three", artist: "Test Artist", artistId: "artist-1", albumId: "album-1", album: "Test Album", duration: 210, starred: false, rating: 0 },
]

// A minimal hand-rolled PNG encoder (solid color, no external deps) — real
// enough for Chromium to actually decode and for the color-extraction spike
// to run its real canvas pixel-reading code against, not a stub.
function crc32(buf: Buffer): number {
  const table: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii")
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createSolidColorPng(r: number, g: number, b: number, size = 32): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const rowSize = size * 3
  const raw = Buffer.alloc((rowSize + 1) * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowSize + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
    }
  }
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
}

async function mockBackend(page: Page) {
  fakePlaylistTracks = [
    { id: "1", mediaFileId: "song-1", playlistId: "1", title: "Track One", artist: "Test Artist", artistId: "artist-1", albumId: "album-1", album: "Test Album", duration: 200, starred: false, rating: 0 },
    { id: "2", mediaFileId: "song-2", playlistId: "1", title: "Track Two", artist: "Test Artist", artistId: "artist-1", albumId: "album-1", album: "Test Album", duration: 190, starred: false, rating: 0 },
    { id: "3", mediaFileId: "song-3", playlistId: "1", title: "Track Three", artist: "Test Artist", artistId: "artist-1", albumId: "album-1", album: "Test Album", duration: 210, starred: false, rating: 0 },
  ]

  await page.route("**/auth/login", (route) => route.fulfill({ json: FAKE_SESSION }))
  await page.route("**/api/album/album-1", (route) => route.fulfill({ json: FAKE_ALBUM }))
  await page.route("**/api/album?**", (route) =>
    route.fulfill({ headers: { "X-Total-Count": "1" }, json: [FAKE_ALBUM] }),
  )
  await page.route("**/api/artist/artist-1", (route) => route.fulfill({ json: FAKE_ARTIST }))
  await page.route("**/api/song?**", (route) => route.fulfill({ json: FAKE_SONGS }))

  await page.route("**/api/playlist?**", (route) =>
    route.fulfill({ headers: { "X-Total-Count": "1" }, json: [FAKE_PLAYLIST] }),
  )
  await page.route("**/api/playlist/1/tracks?**", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: fakePlaylistTracks })
    }
    return route.continue()
  })
  await page.route("**/api/playlist/1", (route) => {
    const method = route.request().method()
    if (method === "GET") return route.fulfill({ json: FAKE_PLAYLIST })
    if (method === "PUT") return route.fulfill({ json: FAKE_PLAYLIST })
    if (method === "DELETE") return route.fulfill({ json: { id: "1" } })
    return route.continue()
  })
  await page.route("**/api/playlist/1/tracks/*", (route) => {
    const method = route.request().method()
    if (method === "PUT") {
      const body = route.request().postDataJSON() as { insert_before: string }
      const pos = route.request().url().split("/").pop()!
      const oldIndex = fakePlaylistTracks.findIndex((t) => t.id === pos)
      const newIndex = fakePlaylistTracks.findIndex((t) => t.id === body.insert_before)
      if (oldIndex !== -1 && newIndex !== -1) {
        const [moved] = fakePlaylistTracks.splice(oldIndex, 1)
        fakePlaylistTracks.splice(newIndex, 0, moved)
      }
      return route.fulfill({ json: { id: pos } })
    }
    if (method === "DELETE") {
      const id = route.request().url().split("/").pop()!
      fakePlaylistTracks = fakePlaylistTracks.filter((t) => t.id !== id)
      return route.fulfill({ json: { id } })
    }
    return route.continue()
  })

  await page.route("**/rest/getArtistInfo2**", (route) =>
    route.fulfill({
      json: { "subsonic-response": { status: "ok", artistInfo2: { similarArtist: [] } } },
    }),
  )
  await page.route("**/rest/getTopSongs**", (route) =>
    route.fulfill({
      json: { "subsonic-response": { status: "ok", topSongs: { song: [] } } },
    }),
  )
  await page.route("**/rest/star**", (route) =>
    route.fulfill({ json: { "subsonic-response": { status: "ok" } } }),
  )
  await page.route("**/rest/unstar**", (route) =>
    route.fulfill({ json: { "subsonic-response": { status: "ok" } } }),
  )
  await page.route("**/rest/setRating**", (route) =>
    route.fulfill({ json: { "subsonic-response": { status: "ok" } } }),
  )
  await page.route("**/rest/scrobble**", (route) =>
    route.fulfill({ json: { "subsonic-response": { status: "ok" } } }),
  )
  await page.route("**/rest/getCoverArt**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: createSolidColorPng(200, 40, 40) }),
  )
}

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("Username").fill("testuser")
  await page.getByLabel("Password").fill("password")
  await page.getByRole("button", { name: /log in/i }).click()
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible()
}

test("navigates Home -> Album -> Artist -> Playlist with no dead ends", async ({ page }) => {
  await mockBackend(page)
  await login(page)

  await page.locator('[data-slot="album-card"]').first().click()
  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible()
  await expect(page.getByText("Track One")).toBeVisible()
  await expect(page.getByText("Track Two")).toBeVisible()

  await page.getByRole("link", { name: "Test Artist" }).click()
  await expect(page.getByRole("heading", { name: "Test Artist" })).toBeVisible()
  await expect(page.getByText("A short biography")).toBeVisible()

  await page.getByRole("link", { name: "Your Library" }).click()
  await expect(page.getByRole("heading", { name: "Playlists" })).toBeVisible()
  await page.getByRole("link", { name: "My Mix", exact: true }).click()
  await expect(page.getByRole("heading", { name: "My Mix" })).toBeVisible()
  await expect(page.getByText("Track Three")).toBeVisible()
})

test("album hero gradient fades in from real extracted cover-art color", async ({ page }) => {
  await mockBackend(page)
  await login(page)

  await page.goto("/#/album/album-1")
  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible()

  const tintedLayer = page.locator('[aria-hidden] > div').nth(1)
  await expect
    .poll(async () => tintedLayer.evaluate((el) => getComputedStyle(el).opacity))
    .toBe("1")
})

test("adds a song to the queue from its overflow menu", async ({ page }) => {
  await mockBackend(page)
  await login(page)

  await page.goto("/#/album/album-1")
  const firstRow = page.locator('[data-slot="song-row"]').first()
  await firstRow.getByRole("button", { name: "More options" }).click()
  await page.getByText("Add to queue").click()

  await page.locator('[data-slot="player-bar"]').getByRole("button", { name: "Queue" }).click()
  await expect(page.getByText("Track One")).toBeVisible()
})

test("reorders playlist tracks by dragging", async ({ page }) => {
  await mockBackend(page)
  await login(page)
  await page.goto("/#/playlist/1")
  await expect(page.getByRole("heading", { name: "My Mix" })).toBeVisible()

  const rows = page.locator('[data-slot="song-row"]')
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText("Track One")

  const firstHandle = page.getByLabel("Drag to reorder").first()
  const thirdRow = rows.nth(2)
  const targetBox = await thirdRow.boundingBox()
  const sourceBox = await firstHandle.boundingBox()
  if (!targetBox || !sourceBox) throw new Error("could not measure drag targets")

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height - 2, {
    steps: 10,
  })
  await page.mouse.up()

  await expect(rows.nth(0)).not.toContainText("Track One", { timeout: 5000 })
})

test("renames a playlist via the edit dialog", async ({ page }) => {
  await mockBackend(page)
  await login(page)
  await page.goto("/#/playlist/1")

  const putRequest = page.waitForRequest(
    (req) => req.url().endsWith("/api/playlist/1") && req.method() === "PUT",
  )
  await page.getByRole("button", { name: "Edit details" }).click()
  await page.getByLabel("Name").fill("Renamed Mix")
  await page.getByRole("button", { name: "Save" }).click()

  const request = await putRequest
  expect(request.postDataJSON()).toMatchObject({ name: "Renamed Mix" })
})

test("deletes a playlist and returns to the playlists list", async ({ page }) => {
  await mockBackend(page)
  await login(page)
  page.on("dialog", (dialog) => dialog.accept())

  await page.goto("/#/playlist/1")
  await page.getByRole("button", { name: "Delete" }).click()
  await expect(page.getByRole("heading", { name: "Playlists" })).toBeVisible()
})
