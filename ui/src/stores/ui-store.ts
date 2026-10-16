import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AlbumsViewMode = 'grid' | 'list'

/** Which content the desktop right rail (app-shell's third column) shows. */
export type RightPanelTab = 'now-playing' | 'queue' | 'lyrics'

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
  /** Persisted: whether the desktop right rail (lg+) is shown at all. */
  rightPanelOpen: boolean
  toggleRightPanel: () => void
  setRightPanelOpen: (open: boolean) => void
  /** Transient: which tab the right rail shows — resets on reload like
   * helpDialogOpen, since it reflects "what was open this session" rather
   * than a durable preference. */
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void
  /** Convenience for "open the rail on this tab" (e.g. the player bar's
   * queue button), instead of two separate calls at every call site. */
  openRightPanelTab: (tab: RightPanelTab) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      albumsViewMode: 'grid',
      setAlbumsViewMode: (mode) => set({ albumsViewMode: mode }),
      helpDialogOpen: false,
      toggleHelpDialog: () =>
        set((state) => ({ helpDialogOpen: !state.helpDialogOpen })),
      setHelpDialogOpen: (open) => set({ helpDialogOpen: open }),
      rightPanelOpen: true,
      toggleRightPanel: () =>
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      rightPanelTab: 'now-playing',
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      openRightPanelTab: (tab) =>
        set({ rightPanelTab: tab, rightPanelOpen: true }),
    }),
    {
      name: 'nd-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        albumsViewMode: state.albumsViewMode,
        rightPanelOpen: state.rightPanelOpen,
      }),
    },
  ),
)
