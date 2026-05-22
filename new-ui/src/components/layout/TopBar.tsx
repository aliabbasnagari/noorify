import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMobileMenu } from '@/contexts/MobileMenuContext'
import { NowPlayingPanel } from '@/components/NowPlayingPanel'

interface TopBarProps {
  scrolled?: boolean
  bgColor?: string
}

export function TopBar({ scrolled = false, bgColor }: TopBarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { openSidebar } = useMobileMenu()

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between h-14 md:h-16 px-4 md:px-6 transition-all duration-300"
      style={{
        backgroundColor: scrolled
          ? bgColor
            ? `${bgColor}e6`
            : 'rgba(18,18,18,0.9)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
      }}
    >
      {/* Navigation arrows */}
      <div className="flex items-center gap-2">
        {/* Hamburger — mobile only */}
        <button
          onClick={openSidebar}
          className="md:hidden w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        {/* Back/forward — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Go back</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Go forward</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <NowPlayingPanel />
            <span className="text-sm font-semibold text-white hidden sm:block">
              {user.name || user.username}
            </span>
            <Avatar className="w-8 h-8 bg-[#1db954]">
              <AvatarFallback className="bg-[#1db954] text-black text-xs font-bold">
                {(user.name || user.username || '?').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-[#a7a7a7] hover:text-white transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Log out</TooltipContent>
            </Tooltip>
          </>
        ) : null}
      </div>
    </div>
  )
}
