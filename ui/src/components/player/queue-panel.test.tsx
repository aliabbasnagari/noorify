import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueuePanel } from "./queue-panel"
import { usePlayerStore, type QueuedTrack } from "@/stores/player-store"

vi.mock("@/lib/player/audio-engine", () => ({
  audioEngine: {
    togglePlayPause: vi.fn(),
    previous: vi.fn(),
    next: vi.fn(),
    seek: vi.fn(),
  },
}))

function track(id: string, title: string): QueuedTrack {
  return {
    id,
    title,
    artist: "Artist",
    albumId: "a",
    albumTitle: "Album",
    durationSeconds: 200,
  }
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

describe("QueuePanel", () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it("lists the now-playing and upcoming tracks, and can remove one", async () => {
    usePlayerStore.setState({
      queue: [track("1", "A"), track("2", "B"), track("3", "C")],
      currentIndex: 0,
    })
    render(<QueuePanel />)
    fireEvent.click(screen.getByRole("button", { name: "Queue" }))

    expect(await screen.findByText("Now playing")).toBeInTheDocument()
    expect(screen.getByText("B")).toBeInTheDocument()
    expect(screen.getByText("C")).toBeInTheDocument()

    const removeButtons = screen.getAllByRole("button", {
      name: "Remove from queue",
    })
    fireEvent.click(removeButtons[0])
    expect(usePlayerStore.getState().queue.map((t) => t.title)).toEqual([
      "A",
      "C",
    ])
  })

  it("shows an empty message when the queue has nothing upcoming", async () => {
    usePlayerStore.setState({ queue: [track("1", "A")], currentIndex: 0 })
    render(<QueuePanel />)
    fireEvent.click(screen.getByRole("button", { name: "Queue" }))

    expect(await screen.findByText("Queue is empty.")).toBeInTheDocument()
  })
})
