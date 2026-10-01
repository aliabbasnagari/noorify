import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AlbumsViewMode = "grid" | "list"

interface UiState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  albumsViewMode: AlbumsViewMode
  setAlbumsViewMode: (mode: AlbumsViewMode) => void
  /** Keyboard-shortcut help overlay (shift+?, old-ui's SHOW_HELP) — a
   * transient UI flag, not a preference, so it's excluded from persistence
   * (partialize below) to avoid reopening on a reload mid-session. */
  helpDialogOpen: boolean
  toggleHelpDialog: () => void
  setHelpDialogOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      albumsViewMode: "grid",
      setAlbumsViewMode: (mode) => set({ albumsViewMode: mode }),
      helpDialogOpen: false,
      toggleHelpDialog: () =>
        set((state) => ({ helpDialogOpen: !state.helpDialogOpen })),
      setHelpDialogOpen: (open) => set({ helpDialogOpen: open }),
    }),
    {
      name: "nd-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        albumsViewMode: state.albumsViewMode,
      }),
    },
  ),
)
