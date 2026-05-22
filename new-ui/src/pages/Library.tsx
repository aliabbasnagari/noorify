import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, List, Search, Plus } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/utils'
import { useFetch } from '@/hooks/useFetch'
import { getPlaylists, getAlbumList, getArtists, getCoverArtUrl } from '@/lib/subsonic'
import { PlaylistModal } from '@/components/playlist/PlaylistModal'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('Playlists')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: playlists, isLoading: loadingPlaylists, refetch: refetchPlaylists } = useFetch(getPlaylists, [])
  const { data: albums, isLoading: loadingAlbums } = useFetch(() => getAlbumList('alphabeticalByName', 100), [])
  const { data: artists, isLoading: loadingArtists } = useFetch(getArtists, [])

  const isLoading =
    (activeTab === 'Playlists' && loadingPlaylists) ||
    (activeTab === 'Albums' && loadingAlbums) ||
    (activeTab === 'Artists' && loadingArtists)

  const items = (() => {
    const q = searchQuery.toLowerCase()
    if (activeTab === 'Playlists') {
      return (playlists ?? [])
        .filter((p) => !q || p.name.toLowerCase().includes(q))
        .map((p) => ({
          id: p.id, name: p.name,
          meta: `Playlist · ${p.owner} · ${p.songCount} songs`,
          to: `/playlist/${p.id}`,
          coverArt: p.coverArt,
          isArtist: false,
        }))
    }
    if (activeTab === 'Albums') {
      return (albums ?? [])
        .filter((a) => !q || a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q))
        .map((a) => ({
          id: a.id, name: a.name,
          meta: `Album · ${a.artist}${a.year ? ` · ${a.year}` : ''}`,
          to: `/album/${a.id}`,
          coverArt: a.coverArt,
          isArtist: false,
        }))
    }
    // Artists
    return (artists ?? [])
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .map((a) => ({
        id: a.id, name: a.name,
        meta: `Artist · ${a.albumCount} albums`,
        to: `/artist/${a.id}`,
        coverArt: a.coverArt,
        isArtist: true,
      }))
  })()

  return (
    <div className="h-full overflow-y-auto">
      <TopBar />
      <div className="px-4 sm:px-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Your Library</h1>
          <div className="flex items-center gap-2">
            {activeTab === 'Playlists' && (
              <button
                onClick={() => setCreateOpen(true)}
                title="New playlist"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[#b3b3b3] hover:text-white hover:bg-[#282828]"
              >
                <Plus size={16} />
              </button>
            )}
            <button onClick={() => setShowSearch((s) => !s)} className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-colors', showSearch ? 'bg-white text-black' : 'text-[#b3b3b3] hover:text-white hover:bg-[#282828]')}>
              <Search size={16} />
            </button>
            <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[#b3b3b3] hover:text-white hover:bg-[#282828]">
              {viewMode === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a7a7a7]" />
            <Input
              type="text"
              placeholder="Search in Your Library"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="h-9 bg-[#282828] text-white border-transparent focus-visible:border-white/30 focus-visible:ring-0 pl-8"
            />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-transparent gap-2 h-auto p-0">
            {['Playlists', 'Albums', 'Artists'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-3 py-1.5 rounded-full text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-[#282828] data-[state=inactive]:text-white hover:bg-[#3e3e3e] data-[state=inactive]:hover:bg-[#3e3e3e] transition-colors"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                <div className="w-12 h-12 rounded-md bg-[#282828]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#282828] rounded w-1/2" />
                  <div className="h-3 bg-[#282828] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-1">
            {items.map((item) => {
              const cover = getCoverArtUrl(item.coverArt, 48)
              return (
                <Link key={item.id} to={item.to} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[#282828] cursor-pointer group transition-colors">
                  <div className={cn('w-12 h-12 flex-shrink-0 bg-[#282828] overflow-hidden', item.isArtist ? 'rounded-full' : 'rounded-md')}>
                    {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-base">{item.isArtist ? '👤' : '♫'}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-[#a7a7a7] truncate">{item.meta}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => {
              const cover = getCoverArtUrl(item.coverArt, 200)
              return (
                <Link key={item.id} to={item.to} className="group bg-[#181818] hover:bg-[#282828] rounded-md p-4 transition-colors cursor-pointer">
                  <div className={cn('aspect-square mb-3 bg-[#282828] overflow-hidden', item.isArtist ? 'rounded-full' : 'rounded-md')}>
                    {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">{item.isArtist ? '👤' : '♫'}</div>}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-[#a7a7a7] truncate mt-1">{item.meta}</p>
                </Link>
              )
            })}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-16">
            {activeTab === 'Playlists' ? (
              <>
                <p className="text-[#a7a7a7] mb-4">You haven't created any playlists yet</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:scale-105 transition-transform"
                >
                  Create your first playlist
                </button>
              </>
            ) : (
              <p className="text-[#a7a7a7]">No items found</p>
            )}
          </div>
        )}
      </div>

      <PlaylistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetchPlaylists}
      />
    </div>
  )
}
