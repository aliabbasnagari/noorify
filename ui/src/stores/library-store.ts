import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Library {
  id: number
  name: string
}

interface LibraryState {
  libraries: Library[]
  /**
   * Selected libraries' union, mirroring old-ui's `LibrarySelector.jsx` /
   * `libraryReducer.js` exactly:
   * - On first population, defaults to ALL library ids (not `[]`) —
   *   selecting everything is the explicit starting state, not "no filter".
   * - A single-library account always resets to `[]` ("all accessible",
   *   no picker shown, no filter needed).
   * - The master "select all/none" checkbox and per-library toggles can
   *   drive the selection down to a real, explicit empty set. Matching
   *   old-ui faithfully, `buildListQuery` (src/lib/api/http.ts) only
   *   applies the `library_id` filter when this is non-empty — so
   *   deliberately unchecking every library is a known old-ui quirk
   *   (label reads "None selected" while results still show everything,
   *   since no filter reaches the server) that this rewrite reproduces
   *   rather than silently "fixes", since the actual intended
   *   filter/all-accessible distinction is `[]`-based end to end.
   */
  activeLibraryIds: number[]
  setLibraries: (libraries: Library[]) => void
  toggleLibraryId: (id: number) => void
  setAllLibrariesSelected: (selected: boolean) => void
  /** Sidebar "Your Library" pin order — client-side only, no backend
   * concept of pinning exists (or is needed) for this. */
  pinnedPlaylistIds: string[]
  togglePinnedPlaylist: (id: string) => void
}

// activeLibraryIds is read by src/lib/api/http.ts's buildListQuery on every
// request (not baked into any query key) — switching the selection relies
// on library-switcher.tsx explicitly invalidating all queries when its
// popover closes, matching old-ui's own refresh()-on-close behavior.
export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      libraries: [],
      activeLibraryIds: [],
      setLibraries: (libraries) => {
        const { libraries: previous, activeLibraryIds: previousSelection } =
          get()
        const newIds = libraries.map((l) => l.id)
        let finalSelection: number[]
        if (previousSelection.length === 0 && previous.length === 0) {
          // First time populating: select all, same as libraryReducer.js.
          finalSelection = newIds
        } else if (newIds.length <= 1) {
          finalSelection = []
        } else {
          finalSelection = previousSelection.filter((id) => newIds.includes(id))
        }
        set({ libraries, activeLibraryIds: finalSelection })
      },
      toggleLibraryId: (id) =>
        set((state) => ({
          activeLibraryIds: state.activeLibraryIds.includes(id)
            ? state.activeLibraryIds.filter((libId) => libId !== id)
            : [...state.activeLibraryIds, id],
        })),
      setAllLibrariesSelected: (selected) =>
        set((state) => ({
          activeLibraryIds: selected ? state.libraries.map((l) => l.id) : [],
        })),
      pinnedPlaylistIds: [],
      togglePinnedPlaylist: (id) =>
        set((state) => ({
          pinnedPlaylistIds: state.pinnedPlaylistIds.includes(id)
            ? state.pinnedPlaylistIds.filter((pinnedId) => pinnedId !== id)
            : [...state.pinnedPlaylistIds, id],
        })),
    }),
    {
      name: "nd-library",
      partialize: (state) => ({
        activeLibraryIds: state.activeLibraryIds,
        pinnedPlaylistIds: state.pinnedPlaylistIds,
      }),
    },
  ),
)
