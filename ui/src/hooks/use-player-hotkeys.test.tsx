import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { usePlayerHotkeys } from "./use-player-hotkeys"
import { audioEngine } from "@/lib/player/audio-engine"
import { getOne } from "@/lib/api/http"
import { star, unstar } from "@/lib/api/subsonic"
import { usePlayerStore, type QueuedTrack } from "@/stores/player-store"
import { useUiStore } from "@/stores/ui-store"
import type { Song } from "@/lib/api/types"

vi.mock("@/lib/player/audio-engine", () => ({
  audioEngine: {
    togglePlayPause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/lib/api/http", () => ({
  getOne: vi.fn(),
}))

vi.mock("@/lib/api/subsonic", () => ({
  star: vi.fn().mockResolvedValue(undefined),
  unstar: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("sonner", () => ({
  toast: vi.fn(),
}))

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...opts,
    }),
  )
}

function renderWithClient() {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => usePlayerHotkeys(), { wrapper })
}

const sampleTrack: QueuedTrack = {
  id: "song1",
  title: "Test Song",
  artist: "Test Artist",
  albumId: "album1",
  albumTitle: "Test Album",
  durationSeconds: 200,
}

const songFixture: Song = {
  id: "song1",
  title: "Test Song",
  artist: "Test Artist",
  artistId: "artist1",
  albumId: "album1",
  album: "Test Album",
  duration: 200,
  starred: false,
  rating: 0,
}

describe("usePlayerHotkeys", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    usePlayerStore.setState({
      volume: 50,
      muted: false,
      queue: [],
      currentIndex: -1,
    })
    useUiStore.setState({ sidebarCollapsed: false, helpDialogOpen: false })
  })

  it("space toggles play/pause", () => {
    renderWithClient()
    fireKey(" ")
    expect(audioEngine.togglePlayPause).toHaveBeenCalledOnce()
  })

  it("arrow keys skip previous/next", () => {
    renderWithClient()
    fireKey("ArrowLeft")
    expect(audioEngine.previous).toHaveBeenCalledOnce()
    fireKey("ArrowRight")
    expect(audioEngine.next).toHaveBeenCalledOnce()
  })

  it("=/- adjust volume by 10", () => {
    renderWithClient()
    fireKey("=")
    expect(usePlayerStore.getState().volume).toBe(60)
    fireKey("-")
    fireKey("-")
    expect(usePlayerStore.getState().volume).toBe(40)
  })

  it("m toggles the sidebar", () => {
    renderWithClient()
    fireKey("m")
    expect(useUiStore.getState().sidebarCollapsed).toBe(true)
  })

  it("ignores keystrokes while typing in an input", () => {
    const input = document.createElement("input")
    document.body.appendChild(input)
    renderWithClient()

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true }),
    )
    expect(audioEngine.togglePlayPause).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it("l stars the current track when it isn't already starred", async () => {
    usePlayerStore.setState({ queue: [sampleTrack], currentIndex: 0 })
    vi.mocked(getOne).mockResolvedValue({ ...songFixture, starred: false })
    renderWithClient()
    fireKey("l")
    await waitFor(() => expect(star).toHaveBeenCalledWith("song1"))
    expect(unstar).not.toHaveBeenCalled()
  })

  it("l unstars the current track when it's already starred", async () => {
    usePlayerStore.setState({ queue: [sampleTrack], currentIndex: 0 })
    vi.mocked(getOne).mockResolvedValue({ ...songFixture, starred: true })
    renderWithClient()
    fireKey("l")
    await waitFor(() => expect(unstar).toHaveBeenCalledWith("song1"))
    expect(star).not.toHaveBeenCalled()
  })

  it("l does nothing for a radio track (no real song to star)", () => {
    usePlayerStore.setState({
      queue: [{ ...sampleTrack, isRadio: true }],
      currentIndex: 0,
    })
    renderWithClient()
    fireKey("l")
    expect(getOne).not.toHaveBeenCalled()
  })

  it("shift+C navigates to the current track's album", () => {
    usePlayerStore.setState({ queue: [sampleTrack], currentIndex: 0 })
    renderWithClient()
    fireKey("C", { shiftKey: true })
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/album/$albumId",
      params: { albumId: "album1" },
    })
  })

  it("plain c without shift does not navigate", () => {
    usePlayerStore.setState({ queue: [sampleTrack], currentIndex: 0 })
    renderWithClient()
    fireKey("c")
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("shift+? toggles the help dialog", () => {
    renderWithClient()
    fireKey("?")
    expect(useUiStore.getState().helpDialogOpen).toBe(true)
    fireKey("?")
    expect(useUiStore.getState().helpDialogOpen).toBe(false)
  })
})
