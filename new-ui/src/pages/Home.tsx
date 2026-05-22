import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, ChevronRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import {
  getAlbumList,
  getAlbum,
  getStarred,
  getCoverArtUrl,
  type SubsonicAlbum,
  type SubsonicSong,
} from '@/lib/subsonic'
import { usePlayer } from '@/contexts/PlayerContext'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function AlbumCard({ album }: { album: SubsonicAlbum }) {
  const cover = getCoverArtUrl(album.coverArt, 300)
  const { playQueue, currentTrack, isPlaying, togglePlay } = usePlayer()
  const [loading, setLoading] = useState(false)

  const isAlbumPlaying = currentTrack?.albumId === album.id && isPlaying

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    if (isAlbumPlaying) { togglePlay(); return }
    setLoading(true)
    try {
      const albumData = await getAlbum(album.id)
      const songs = albumData.song ?? []
      if (songs.length > 0) playQueue(songs, 0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Link to={`/album/${album.id}`}>
      <Card className="group bg-card hover:bg-[#282828] border-0 ring-0 cursor-pointer transition-colors gap-0 py-0 rounded-md">
        <div className="relative p-4 pb-3">
          <div className="aspect-square rounded-md overflow-hidden bg-[#282828] mb-4">
            {cover ? (
              <img src={cover} alt={album.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-3xl">
                ♫
              </div>
            )}
          </div>
          <button
            onClick={handlePlay}
            className="absolute bottom-[68px] right-6 w-10 h-10 bg-[#1db954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-lg disabled:opacity-40"
            disabled={loading}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/50 border-t-black rounded-full animate-spin" />
            ) : isAlbumPlaying ? (
              <Pause size={16} fill="black" className="text-black" />
            ) : (
              <Play size={16} fill="black" className="text-black translate-x-0.5" />
            )}
          </button>
          <p className="text-sm font-semibold text-white truncate">{album.name}</p>
          <p className="text-xs text-[#a7a7a7] truncate mt-1">{album.artist}</p>
        </div>
      </Card>
    </Link>
  )
}

function SongRow({ song }: { song: SubsonicSong }) {
  const cover = getCoverArtUrl(song.coverArt, 60)
  const { playTrack } = usePlayer()
  return (
    <div
      className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded overflow-hidden cursor-pointer transition-colors"
      onClick={() => playTrack(song)}
    >
      <div className="w-16 h-16 flex-shrink-0 bg-[#282828]">
        {cover ? (
          <img src={cover} alt={song.album} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">♫</div>
        )}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-white font-semibold text-sm truncate">{song.title}</p>
        <p className="text-[#a7a7a7] text-xs truncate">{song.artist}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); playTrack(song) }}
        className="ml-auto mr-3 w-10 h-10 bg-[#1db954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg flex-shrink-0"
      >
        <Play size={16} fill="black" className="text-black translate-x-0.5" />
      </button>
    </div>
  )
}

function SkeletonAlbumCard() {
  return (
    <Card className="bg-card border-0 ring-0 gap-0 py-0 rounded-md">
      <div className="p-4 pb-3 space-y-3">
        <Skeleton className="aspect-square w-full rounded-md" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>
    </Card>
  )
}

function SkeletonSongRow() {
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded overflow-hidden">
      <Skeleton className="w-16 h-16 flex-shrink-0 rounded-none" />
      <div className="flex-1 space-y-2 pr-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

function Section({
  title,
  to,
  loading,
  items,
}: {
  title: string
  to: string
  loading: boolean
  items: SubsonicAlbum[]
}) {
  if (!loading && items.length === 0) return null
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <Link
          to={to}
          className="text-xs font-bold text-[#a7a7a7] hover:text-white uppercase tracking-wider flex items-center gap-1"
        >
          Show all <ChevronRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonAlbumCard key={i} />)
          : items.slice(0, 5).map((album) => <AlbumCard key={album.id} album={album} />)}
      </div>
    </section>
  )
}

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)

  const { data: recentAlbums, isLoading: loadingRecent } = useFetch(() => getAlbumList('recent', 6), [])
  const { data: newestAlbums, isLoading: loadingNewest } = useFetch(() => getAlbumList('newest', 10), [])
  const { data: frequentAlbums, isLoading: loadingFrequent } = useFetch(() => getAlbumList('frequent', 10), [])
  const { data: randomAlbums, isLoading: loadingRandom } = useFetch(() => getAlbumList('random', 10), [])
  const { data: starred, isLoading: loadingStarred } = useFetch(getStarred, [])

  const recentSongs = starred?.song?.slice(0, 6) ?? []

  return (
    <div
      className="h-full overflow-y-auto"
      onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a2f] via-[#121212]/80 to-[#121212] pointer-events-none" />
        <TopBar scrolled={scrollY > 60} bgColor="#1e3a2f" />

        <div className="relative px-4 sm:px-6 pb-6">
          <h1 className="text-3xl font-bold text-white mb-6">{getGreeting()}</h1>

          {loadingStarred ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonSongRow key={i} />)}
            </div>
          ) : recentSongs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {recentSongs.map((song) => (
                <SongRow key={song.id} song={song} />
              ))}
            </div>
          ) : (recentAlbums ?? []).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(recentAlbums ?? []).slice(0, 6).map((album) => (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className="group flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded overflow-hidden cursor-pointer transition-colors"
                >
                  <div className="w-16 h-16 flex-shrink-0 bg-[#282828]">
                    {album.coverArt ? (
                      <img src={getCoverArtUrl(album.coverArt, 60)} alt={album.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">♫</div>
                    )}
                  </div>
                  <span className="text-white font-semibold text-sm truncate pr-2">{album.name}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-8 space-y-8">
        <Section title="Recently played" to="/library" loading={loadingRecent} items={recentAlbums ?? []} />
        <Section title="New releases" to="/library" loading={loadingNewest} items={newestAlbums ?? []} />
        <Section title="Most played" to="/library" loading={loadingFrequent} items={frequentAlbums ?? []} />
        <Section title="Discover" to="/library" loading={loadingRandom} items={randomAlbums ?? []} />
        {(starred?.album?.length ?? 0) > 0 && (
          <Section title="Liked albums" to="/library" loading={false} items={starred!.album.slice(0, 10)} />
        )}
      </div>
    </div>
  )
}
