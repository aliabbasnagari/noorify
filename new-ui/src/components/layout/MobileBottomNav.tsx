import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, Library, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileMenu } from '@/contexts/MobileMenuContext'

const NAV = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Search, label: 'Search', to: '/search' },
  { icon: Library, label: 'Library', to: '/library' },
]

export function MobileBottomNav() {
  const location = useLocation()
  const { openSidebar } = useMobileMenu()

  return (
    <nav className="flex items-center bg-[#181818] border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)]">
      {NAV.map(({ icon: Icon, label, to }) => {
        const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              className={cn(active ? 'text-white' : 'text-[#a7a7a7]')}
            />
            <span className={cn(active ? 'text-white' : 'text-[#a7a7a7]')}>{label}</span>
          </NavLink>
        )
      })}
      <button
        onClick={openSidebar}
        className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-[#a7a7a7]"
      >
        <Menu size={22} strokeWidth={1.8} />
        <span>More</span>
      </button>
    </nav>
  )
}
