import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, Library, Plus, ArrowRight, Music2, Heart, LogOut, Upload, Radio, Share2, Music, Settings, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useFetch } from '@/hooks/useFetch'
import { getPlaylists, getCoverArtUrl } from '@/lib/subsonic'
import { useAuth } from '@/contexts/AuthContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
import { useTranslation } from '@/contexts/I18nContext'
import { PlaylistModal } from '@/components/playlist/PlaylistModal'

const NAV_ITEMS = [
  { icon: Home, key: 'home', to: '/' },
  { icon: Search, key: 'search', to: '/search' },
  { icon: Music, key: 'songs', to: '/songs' },
  { icon: Radio, key: 'radio', to: '/radio' },
  { icon: Bookmark, key: 'bookmarks', to: '/bookmarks' },
]

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { enableSharing } = useServerConfig()
  const { t } = useTranslation()
  const { data: playlists, isLoading, refetch } = useFetch(getPlaylists, [])
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <aside className="flex flex-col w-[280px] min-w-[280px] h-full gap-2 p-2 bg-black overflow-hidden">
      {/* Main nav card */}
      <div className="rounded-lg bg-[#121212] p-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ icon: Icon, key, to }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={cn(
                'flex items-center gap-4 px-2 py-3 rounded-md text-sm font-bold transition-colors hover:text-white',
                active ? 'text-white' : 'text-[#b3b3b3]',
              )}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
              {t(`nav.${key}`)}
            </NavLink>
          )
        })}
        <NavLink
            to="/liked"
            className={({ isActive }) => cn(
              'flex items-center gap-4 px-2 py-3 rounded-md text-sm font-bold transition-colors hover:text-white',
              isActive ? 'text-white' : 'text-[#b3b3b3]',
            )}
          >
            <Heart size={24} strokeWidth={1.8} />
            {t('nav.likedSongs')}
          </NavLink>
          {enableSharing && (
          <NavLink
            to="/shares"
            className={({ isActive }) => cn(
              'flex items-center gap-4 px-2 py-3 rounded-md text-sm font-bold transition-colors hover:text-white',
              isActive ? 'text-white' : 'text-[#b3b3b3]',
            )}
          >
            <Share2 size={24} strokeWidth={1.8} />
            {t('nav.shares')}
          </NavLink>
          )}
          {user?.isAdmin && (
          <NavLink
            to="/upload"
            className={({ isActive }) => cn(
              'flex items-center gap-4 px-2 py-3 rounded-md text-sm font-bold transition-colors hover:text-white',
              isActive ? 'text-white' : 'text-[#b3b3b3]',
            )}
          >
            <Upload size={24} strokeWidth={1.8} />
            {t('nav.upload')}
          </NavLink>
        )}
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              'flex items-center gap-4 px-2 py-3 rounded-md text-sm font-bold transition-colors hover:text-white',
              isActive ? 'text-white' : 'text-[#b3b3b3]',
            )}
          >
            <Settings size={24} strokeWidth={1.8} />
            {t('nav.settings')}
          </NavLink>
      </div>

      {/* Library card */}
      <div className="rounded-lg bg-[#121212] flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <NavLink to="/library" className={({ isActive }) => cn('flex items-center gap-2 font-bold text-sm transition-colors', isActive ? 'text-white' : 'text-[#b3b3b3] hover:text-white')}>
            <Library size={24} strokeWidth={1.8} />
            <span>{t('nav.library')}</span>
          </NavLink>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCreateOpen(true)}
              title={t('nav.addPlaylist')}
              className="w-8 h-8 rounded-full hover:bg-[#282828] text-[#b3b3b3] hover:text-white"
            >
              <Plus size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-[#282828] text-[#b3b3b3] hover:text-white">
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-2 pb-2 flex gap-2">
          <NavLink to="/library" className={({ isActive }) => cn('px-3 py-1 rounded-full text-xs font-semibold transition-colors', isActive ? 'bg-white text-black' : 'bg-[#282828] text-white hover:bg-[#3e3e3e]')}>
            Playlists
          </NavLink>
        </div>

        {/* Playlist list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                  <div className="w-10 h-10 rounded bg-[#282828]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-[#282828] rounded w-3/4" />
                    <div className="h-3 bg-[#282828] rounded w-1/2" />
                  </div>
                </div>
              ))
            : (playlists ?? []).map((playlist) => {
                const cover = getCoverArtUrl(playlist.coverArt, 40)
                return (
                  <NavLink
                    key={playlist.id}
                    to={`/playlist/${playlist.id}`}
                    className={({ isActive }) => cn('flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group', isActive && 'bg-[#282828]')}
                  >
                    <div className="w-10 h-10 rounded bg-[#282828] flex-shrink-0 overflow-hidden group-hover:bg-[#3e3e3e]">
                      {cover ? (
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Music2 size={16} className="text-[#b3b3b3]" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
                      <p className="text-xs text-[#b3b3b3] truncate">{t('playlist.type')} · {playlist.owner}</p>
                    </div>
                  </NavLink>
                )
              })}
        </div>
      </div>

      {/* User + Logout */}
      {user && (
        <div className="rounded-lg bg-[#121212] p-3 flex items-center gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-[#1db954] text-black text-xs font-bold">
              {(user.name || user.username).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name || user.username}</p>
            {user.isAdmin && <p className="text-xs text-[#a7a7a7]">Admin</p>}
          </div>
          <button onClick={logout} className="text-[#a7a7a7] hover:text-white transition-colors flex-shrink-0" title={t('nav.logout')}>
            <LogOut size={16} />
          </button>
        </div>
      )}

      <PlaylistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
      />
    </aside>
  )
}
