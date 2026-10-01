import { beforeEach, describe, expect, it } from "vitest"
import { usePlayerStore, type QueuedTrack } from "./player-store"

function track(id: string): QueuedTrack {
  return {
    id,
    title: `Track ${id}`,
    artist: "Artist",
    albumId: "album-1",
    albumTitle: "Album",
    durationSeconds: 180,
  }
}

function resetStore() {
  usePlayerStore.setState({
    queue: [],
    currentIndex: -1,
    playNonce: 0,
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

describe("player-store", () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it("setQueue replaces the queue and starts at the given index", () => {
    const tracks = [track("a"), track("b"), track("c")]
    usePlayerStore.getState().setQueue(tracks, 1)
    expect(usePlayerStore.getState().queue).toEqual(tracks)
    expect(usePlayerStore.getState().currentIndex).toBe(1)
  })

  it("setQueue clears any shuffle state from a previous queue", () => {
    usePlayerStore.getState().setQueue([track("a"), track("b")], 0)
    usePlayerStore.getState().toggleShuffle()
    usePlayerStore.getState().setQueue([track("x"), track("y")], 0)
    expect(usePlayerStore.getState().shuffle).toBe(false)
    expect(usePlayerStore.getState().unshuffledQueue).toBeNull()
  })

  describe("playNext / playPrevious", () => {
    it("advances to the next track", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 0)
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(1)
    })

    it("stops at the end of the queue when repeat is off", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 1)
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(1)
    })

    it("wraps to the start when repeat is 'all'", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 1)
      usePlayerStore.getState().cycleRepeatMode() // off -> all
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(0)
    })

    it("goes back to the previous track", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 1)
      usePlayerStore.getState().playPrevious()
      expect(usePlayerStore.getState().currentIndex).toBe(0)
    })

    it("wraps to the end when repeat is 'all' and at the start", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 0)
      usePlayerStore.getState().cycleRepeatMode()
      usePlayerStore.getState().playPrevious()
      expect(usePlayerStore.getState().currentIndex).toBe(1)
    })
  })

  it("cycleRepeatMode cycles off -> all -> one -> off", () => {
    expect(usePlayerStore.getState().repeatMode).toBe("off")
    usePlayerStore.getState().cycleRepeatMode()
    expect(usePlayerStore.getState().repeatMode).toBe("all")
    usePlayerStore.getState().cycleRepeatMode()
    expect(usePlayerStore.getState().repeatMode).toBe("one")
    usePlayerStore.getState().cycleRepeatMode()
    expect(usePlayerStore.getState().repeatMode).toBe("off")
  })

  describe("queue editing", () => {
    it("addToQueue appends to the end", () => {
      usePlayerStore.getState().setQueue([track("a")], 0)
      usePlayerStore.getState().addToQueue(track("b"))
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "b",
      ])
    })

    it("playNextInQueue inserts right after the current track", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 0)
      usePlayerStore.getState().playNextInQueue(track("x"))
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "x",
        "b",
      ])
    })

    it("removeFromQueue removes an upcoming track and keeps currentIndex correct", () => {
      usePlayerStore
        .getState()
        .setQueue([track("a"), track("b"), track("c")], 0)
      usePlayerStore.getState().removeFromQueue(1)
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "c",
      ])
      expect(usePlayerStore.getState().currentIndex).toBe(0)
    })

    it("removeFromQueue refuses to remove the currently playing track", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 0)
      usePlayerStore.getState().removeFromQueue(0)
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "b",
      ])
    })

    it("moveInQueue reorders two upcoming tracks", () => {
      usePlayerStore
        .getState()
        .setQueue([track("a"), track("b"), track("c")], 0)
      usePlayerStore.getState().moveInQueue(1, 1)
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "c",
        "b",
      ])
    })

    it("moveInQueue refuses to touch the now-playing track", () => {
      usePlayerStore
        .getState()
        .setQueue([track("a"), track("b"), track("c")], 1)
      usePlayerStore.getState().moveInQueue(1, -1)
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "b",
        "c",
      ])
    })
  })

  describe("shuffle", () => {
    it("keeps the currently playing track in place and restores order on toggle off", () => {
      const tracks = [
        track("a"),
        track("b"),
        track("c"),
        track("d"),
        track("e"),
      ]
      usePlayerStore.getState().setQueue(tracks, 1)
      usePlayerStore.getState().toggleShuffle()

      const { queue, currentIndex, shuffle } = usePlayerStore.getState()
      expect(shuffle).toBe(true)
      expect(queue[currentIndex].id).toBe("b")
      expect(queue.slice(0, 2).map((t) => t.id)).toEqual(["a", "b"])

      usePlayerStore.getState().toggleShuffle()
      const restored = usePlayerStore.getState()
      expect(restored.shuffle).toBe(false)
      expect(restored.queue.map((t) => t.id)).toEqual(["a", "b", "c", "d", "e"])
      expect(restored.currentIndex).toBe(1)
    })

    it("keeps tracks added while shuffled when shuffle is turned off", () => {
      usePlayerStore
        .getState()
        .setQueue([track("a"), track("b"), track("c"), track("d")], 0)
      usePlayerStore.getState().toggleShuffle()
      usePlayerStore.getState().addToQueue(track("x"))
      usePlayerStore.getState().playNextInQueue(track("y"))

      usePlayerStore.getState().toggleShuffle()
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "y",
        "b",
        "c",
        "d",
        "x",
      ])
    })

    it("does not resurrect tracks removed while shuffled", () => {
      usePlayerStore
        .getState()
        .setQueue([track("a"), track("b"), track("c")], 0)
      usePlayerStore.getState().toggleShuffle()
      const removeAt = usePlayerStore
        .getState()
        .queue.findIndex((t) => t.id === "c")
      usePlayerStore.getState().removeFromQueue(removeAt)

      usePlayerStore.getState().toggleShuffle()
      expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual([
        "a",
        "b",
      ])
    })
  })

  describe("playNonce", () => {
    it("bumps when repeat-all wraps a single-track queue onto itself", () => {
      usePlayerStore.getState().setQueue([track("a")], 0)
      usePlayerStore.getState().cycleRepeatMode() // off -> all
      const before = usePlayerStore.getState().playNonce
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().currentIndex).toBe(0)
      expect(usePlayerStore.getState().playNonce).toBe(before + 1)
    })

    it("bumps when the current track is re-selected", () => {
      usePlayerStore.getState().setQueue([track("a"), track("b")], 0)
      const before = usePlayerStore.getState().playNonce
      usePlayerStore.getState().playTrackAt(0)
      expect(usePlayerStore.getState().playNonce).toBe(before + 1)
    })

    it("does not bump at the end of the queue with repeat off", () => {
      usePlayerStore.getState().setQueue([track("a")], 0)
      const before = usePlayerStore.getState().playNonce
      usePlayerStore.getState().playNext()
      expect(usePlayerStore.getState().playNonce).toBe(before)
    })
  })

  describe("volume", () => {
    it("clamps to 0-100 and clears mute", () => {
      usePlayerStore.getState().toggleMute()
      usePlayerStore.getState().setVolume(150)
      expect(usePlayerStore.getState().volume).toBe(100)
      expect(usePlayerStore.getState().muted).toBe(false)

      usePlayerStore.getState().setVolume(-10)
      expect(usePlayerStore.getState().volume).toBe(0)
    })

    it("toggleMute flips the muted flag", () => {
      expect(usePlayerStore.getState().muted).toBe(false)
      usePlayerStore.getState().toggleMute()
      expect(usePlayerStore.getState().muted).toBe(true)
    })
  })
})
