import { createContext, useContext, useState } from 'react'

interface MobileMenuContextValue {
  sidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
}

const MobileMenuContext = createContext<MobileMenuContextValue>({
  sidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
})

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <MobileMenuContext.Provider value={{
      sidebarOpen,
      openSidebar: () => setSidebarOpen(true),
      closeSidebar: () => setSidebarOpen(false),
    }}>
      {children}
    </MobileMenuContext.Provider>
  )
}

export function useMobileMenu() {
  return useContext(MobileMenuContext)
}
