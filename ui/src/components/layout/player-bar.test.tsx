import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, fireEvent, within } from "@testing-library/react"
import { PlayerBar } from "./player-bar"
import { audioEngine } from "@/lib/player/audio-engine"
import { usePlayerStore, type QueuedTrack } from "@/stores/player-store"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/player/audio-engine", () => ({
  audioEngine: {
    togglePlayPause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    seek: vi.fn(),
  },
}))

const sampleTrack: QueuedTrack = {
  id: "1",
  title: "Test Song",
  artist: "Test Artist",
  albumId: "a1",
  albumTitle: "Test Album",
  durationSeconds: 200,
}

function resetStore() {
  usePlayerStore.setState({
    queue: [],
    currentIndex: -1,
    shuffle: false,
    unshuffledQueue: null,
    repeatMode: "off",
    volume: 100,
    muted: false,
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
  })
}

// PlayerBar renders two parallel layouts (a mobile compact bar and the full
// desktop bar, toggled purely by CSS media queries — see player-bar.tsx) —
// jsdom doesn't reliably apply `md:hidden`'s media condition the way a real
// browser viewport would, so both are present in the test DOM at once and
// share several accessible names ("Play"/"Pause"/track title). Scoping to
// the desktop layout's data-slot keeps these tests meaningful regardless of
// jsdom's actual CSS behavior, rather than gambling on it.
function renderDesktop() {
  const { container, ...rest } = render(<PlayerBar />)
  const desktop = container.querySelector(
    '[data-slot="player-bar-desktop"]',
  ) as HTMLElement
  return { ...rest, container, desktop, screen: within(desktop) }
}

describe("PlayerBar", () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
    vi.clearAllMocks()
  })

  it("shows a disabled placeholder state when nothing is queued", () => {
    const { screen } = renderDesktop()
    expect(screen.getByText("Nothing playing")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled()
  })

  it("shows the current track and a working play/pause button", () => {
    usePlayerStore.setState({ queue: [sampleTrack], currentIndex: 0 })
    const { screen } = renderDesktop()
    expect(screen.getByText("Test Song")).toBeInTheDocument()
    expect(screen.getByText("Test Artist")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Play" }))
    expect(audioEngine.togglePlayPause).toHaveBeenCalledOnce()
  })

  it("shows a pause icon while playing and wires next/previous", () => {
    usePlayerStore.setState({
      queue: [sampleTrack],
      currentIndex: 0,
      isPlaying: true,
    })
    const { screen } = renderDesktop()
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(audioEngine.next).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole("button", { name: "Previous" }))
    expect(audioEngine.previous).toHaveBeenCalledOnce()
  })

  it("toggles shuffle and repeat state", () => {
    usePlayerStore.setState({ queue: [sampleTrack], currentIndex: 0 })
    const { screen } = renderDesktop()

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }))
    expect(usePlayerStore.getState().shuffle).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: /Repeat:/ }))
    expect(usePlayerStore.getState().repeatMode).toBe("all")
  })

  it("mobile mini player's play button toggles playback without navigating", () => {
    usePlayerStore.setState({ queue: [sampleTrack], currentIndex: 0 })
    const { container } = render(<PlayerBar />)
    const mobile = within(
      container.querySelector('[data-slot="player-bar-mobile"]') as HTMLElement,
    )
    fireEvent.click(mobile.getByRole("button", { name: "Play" }))
    expect(audioEngine.togglePlayPause).toHaveBeenCalledOnce()
  })
})
