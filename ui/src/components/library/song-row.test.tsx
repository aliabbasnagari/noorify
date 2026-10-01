import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SongRow } from "./song-row"
import type { Song } from "@/lib/api/types"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/api/http", () => ({
  getList: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  apiFetch: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/api/subsonic", () => ({
  downloadUrl: (id: string) => `https://example.test/download/${id}`,
  star: vi.fn().mockResolvedValue(undefined),
  unstar: vi.fn().mockResolvedValue(undefined),
}))

const song: Song = {
  id: "song-1",
  title: "Test Song",
  artist: "Test Artist",
  artistId: "artist-1",
  albumId: "album-1",
  album: "Test Album",
  duration: 200,
  trackNumber: 3,
  starred: false,
  rating: 0,
}

function renderRow(
  overrides: Partial<{
    song: Song
    index: number
    showAlbum: boolean
    active: boolean
  }> = {},
) {
  const client = new QueryClient()
  const onPlay = vi.fn()
  const onPlayNext = vi.fn()
  const onAddToQueue = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <SongRow
        song={song}
        index={2}
        onPlay={onPlay}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        {...overrides}
      />
    </QueryClientProvider>,
  )
  return { onPlay, onPlayNext, onAddToQueue }
}

describe("SongRow", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the real track number, title, and artist", () => {
    renderRow()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Test Song")).toBeInTheDocument()
    expect(screen.getByText("Test Artist")).toBeInTheDocument()
  })

  it("falls back to index + 1 when there's no track number", () => {
    renderRow({ song: { ...song, trackNumber: undefined } })
    expect(screen.getByText("3")).toBeInTheDocument() // index=2 -> displays 3
  })

  it("shows the album name when showAlbum is set", () => {
    renderRow({ showAlbum: true })
    expect(screen.getByText(/Test Artist.*Test Album/)).toBeInTheDocument()
  })

  it("calls onPlay when the title is clicked", () => {
    const { onPlay } = renderRow()
    fireEvent.click(screen.getByText("Test Song"))
    expect(onPlay).toHaveBeenCalledOnce()
  })

  it("offers play-next and add-to-queue in the overflow menu", async () => {
    // Whether a simulated click actually fires base-ui Menu.Item's
    // selection handler is exercised for real in e2e (jsdom's lack of real
    // pointer/layout makes this specific interaction unreliable to assert
    // here) — this just confirms the menu is wired with the right actions.
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole("button", { name: "More options" }))
    expect(await screen.findByText("Play next")).toBeInTheDocument()
    expect(screen.getByText("Add to queue")).toBeInTheDocument()
  })

  it("links to the song's album and artist from the overflow menu", async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(screen.getByRole("button", { name: "More options" }))
    expect(await screen.findByText("Go to album")).toHaveAttribute(
      "href",
      "/album/$albumId",
    )
    expect(screen.getByText("Go to artist")).toHaveAttribute(
      "href",
      "/artist/$artistId",
    )
  })
})
