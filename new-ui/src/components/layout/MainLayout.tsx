import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PlayerBar } from './PlayerBar'
import { MobileBottomNav } from './MobileBottomNav'
import { useMobileMenu } from '@/contexts/MobileMenuContext'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

export function MainLayout() {
  const { sidebarOpen, closeSidebar } = useMobileMenu()
  const location = useLocation()

  // Close mobile sidebar on navigation
  useEffect(() => {
    closeSidebar()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-[100dvh] bg-black overflow-hidden">
      {/* Main area: sidebar (desktop) + content */}
      <div className="flex flex-1 min-h-0 md:gap-2 md:p-2 md:pb-0">

        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile sidebar — slides in as a Drawer */}
        <Drawer open={sidebarOpen} onOpenChange={(v) => { if (!v) closeSidebar() }} direction="left">
          <DrawerContent className="p-0 bg-black border-0 h-full" style={{ width: 300 }}>
            <Sidebar />
          </DrawerContent>
        </Drawer>

        {/* Main scrollable area */}
        <main className="flex-1 min-w-0 md:rounded-lg bg-[#121212] overflow-hidden relative">
          <div className="h-full overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Desktop player bar */}
      <div className="hidden md:block flex-shrink-0 px-2 pb-2">
        <PlayerBar />
      </div>

      {/* Mobile: compact player + bottom nav */}
      <div className="md:hidden flex-shrink-0">
        <PlayerBar />
        <MobileBottomNav />
      </div>
    </div>
  )
}
