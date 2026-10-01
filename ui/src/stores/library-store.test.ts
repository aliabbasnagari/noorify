import { beforeEach, describe, expect, it } from "vitest"
import { useLibraryStore } from "./library-store"

describe("library-store", () => {
  beforeEach(() => {
    localStorage.clear()
    useLibraryStore.setState({
      libraries: [],
      activeLibraryIds: [],
      pinnedPlaylistIds: [],
    })
  })

  it("togglePinnedPlaylist adds an id when not pinned", () => {
    useLibraryStore.getState().togglePinnedPlaylist("pl-1")
    expect(useLibraryStore.getState().pinnedPlaylistIds).toEqual(["pl-1"])
  })

  it("togglePinnedPlaylist removes the id when already pinned", () => {
    useLibraryStore.getState().togglePinnedPlaylist("pl-1")
    useLibraryStore.getState().togglePinnedPlaylist("pl-2")
    useLibraryStore.getState().togglePinnedPlaylist("pl-1")
    expect(useLibraryStore.getState().pinnedPlaylistIds).toEqual(["pl-2"])
  })

  it("setLibraries selects all libraries the first time it's populated", () => {
    useLibraryStore.getState().setLibraries([
      { id: 1, name: "Music" },
      { id: 2, name: "Podcasts" },
    ])
    expect(useLibraryStore.getState().activeLibraryIds).toEqual([1, 2])
  })

  it("setLibraries drops ids that no longer exist, keeping the rest", () => {
    useLibraryStore.getState().setLibraries([
      { id: 1, name: "Music" },
      { id: 2, name: "Podcasts" },
      { id: 3, name: "Audiobooks" },
    ])
    useLibraryStore.getState().toggleLibraryId(3) // -> [1, 2]

    useLibraryStore.getState().setLibraries([
      { id: 1, name: "Music" },
      { id: 2, name: "Podcasts" },
    ])
    expect(useLibraryStore.getState().activeLibraryIds).toEqual([1, 2])
  })

  it("setLibraries resets to [] when the account now has only one library", () => {
    useLibraryStore.getState().setLibraries([
      { id: 1, name: "Music" },
      { id: 2, name: "Podcasts" },
    ])
    useLibraryStore.getState().setLibraries([{ id: 1, name: "Music" }])
    expect(useLibraryStore.getState().activeLibraryIds).toEqual([])
  })

  it("toggleLibraryId adds and removes ids from the selection", () => {
    useLibraryStore.getState().setLibraries([
      { id: 1, name: "Music" },
      { id: 2, name: "Podcasts" },
    ])
    useLibraryStore.getState().toggleLibraryId(2)
    expect(useLibraryStore.getState().activeLibraryIds).toEqual([1])

    useLibraryStore.getState().toggleLibraryId(2)
    expect(useLibraryStore.getState().activeLibraryIds).toEqual([1, 2])
  })

  it("setAllLibrariesSelected(true) selects every library, (false) selects none", () => {
    useLibraryStore.getState().setLibraries([
      { id: 1, name: "Music" },
      { id: 2, name: "Podcasts" },
    ])
    useLibraryStore.getState().setAllLibrariesSelected(false)
    expect(useLibraryStore.getState().activeLibraryIds).toEqual([])

    useLibraryStore.getState().setAllLibrariesSelected(true)
    expect(useLibraryStore.getState().activeLibraryIds).toEqual([1, 2])
  })
})
