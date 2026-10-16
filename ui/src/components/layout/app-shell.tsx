import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { PlayerBar } from '@/components/layout/player-bar'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { HelpDialog } from '@/components/layout/help-dialog'
import { RightRail } from '@/components/layout/right-rail'
import { usePlayerHotkeys } from '@/hooks/use-player-hotkeys'
import { useQueueSync } from '@/hooks/use-queue-sync'
import { useSyncUserLibraries } from '@/hooks/use-sync-user-libraries'
import { useUiStore } from '@/stores/ui-store'

export function AppShell({ children }: { children: ReactNode }) {
  usePlayerHotkeys()
  useSyncUserLibraries()
  useQueueSync()
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen)

  return (
    <div className="grid h-dvh grid-rows-[auto_1fr_auto_auto] bg-background text-foreground">
      {/* Spans the full width above all three columns below, Spotify-style,
          rather than sitting only above the main column. */}
      <AppTopbar />
      <div className="grid min-h-0 grid-cols-1 gap-2 px-2 pt-2 pb-2 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto]">
        {/* Below md, the sidebar is replaced entirely by MobileTabBar +
            library-page.tsx's hub (see mobile-tab-bar.tsx's doc comment) —
            there's no room for a persistent side rail at phone width. */}
        <div className="hidden md:contents">
          <AppSidebar />
        </div>
        {/* min-w-0 on <main>: a grid item's default min-width is "auto" (its
            content's intrinsic width), not 0 — without overriding it, a
            horizontally-scrolling shelf's full unwrapped content width leaks
            upward and stretches this whole 1fr column (and the page) wider
            than the viewport instead of being clipped by its own
            overflow-x-auto. */}
        <main className="scrollbar-fade min-h-0 min-w-0 overflow-y-auto rounded-xl bg-card px-2 pb-6 md:px-4">
          {children}
        </main>
        {/* The dynamic right rail: now-playing info, queue, or lyrics. Only
            lg+ has room for a persistent third column; below that, the same
            content is reached via the queue Sheet / "/now-playing" route. */}
        {rightPanelOpen && (
          <div className="hidden lg:contents">
            <RightRail />
          </div>
        )}
      </div>
      <PlayerBar />
      <MobileTabBar />
      <HelpDialog />
    </div>
  )
}
