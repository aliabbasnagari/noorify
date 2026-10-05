import type { ReactNode } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { PlayerBar } from "@/components/layout/player-bar"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"
import { HelpDialog } from "@/components/layout/help-dialog"
import { usePlayerHotkeys } from "@/hooks/use-player-hotkeys"
import { useQueueSync } from "@/hooks/use-queue-sync"
import { useSyncUserLibraries } from "@/hooks/use-sync-user-libraries"

export function AppShell({ children }: { children: ReactNode }) {
  usePlayerHotkeys()
  useSyncUserLibraries()
  useQueueSync()

  return (
    <div className="grid h-dvh grid-rows-[1fr_auto_auto] bg-background text-foreground">
      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[auto_1fr]">
        {/* Below md, the sidebar is replaced entirely by MobileTabBar +
            library-page.tsx's hub (see mobile-tab-bar.tsx's doc comment) —
            there's no room for a persistent side rail at phone width. */}
        <div className="hidden md:contents">
          <AppSidebar />
        </div>
        {/* min-w-0 on both this grid item and <main> below: a flex/grid
            item's default min-width is "auto" (its content's intrinsic
            width), not 0 — without overriding it, a horizontally-scrolling
            shelf's full unwrapped content width leaks upward and stretches
            this whole 1fr column (and the page) wider than the viewport
            instead of being clipped by its own overflow-x-auto. */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <AppTopbar />
          <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
      <PlayerBar />
      <MobileTabBar />
      <HelpDialog />
    </div>
  )
}
