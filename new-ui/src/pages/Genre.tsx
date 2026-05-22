import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, Pause, Heart, Clock, MoreHorizontal, Disc3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getSongsByGenre, getCoverArtUrl, star, unstar, getStarred } from '@/lib/subsonic'
import { usePlayer } from '@/contexts/PlayerContext'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

const GENRE_GRADIENT = [
  'from-[#c13584] to-[#833ab4]',
  'from-[#e17000] to-[#c13584]',
  'from-[#0d73ec] to-[#00b09b]',
  'from-[#56a0a0] to-[#2193b0]',
  'from-[#8c1932] to-[#e8115b]',
  'from-[#148a08] to-[#1e9656]',
  'from-[#1e3264] to-[#509bf5]',
]

function getGradient(genre: string): string {
  const idx = genre.charCodeAt(0) % GENRE_GRADIENT.length
  return GENRE_GRADIENT[idx]
}

export default function GenrePage() {
  const { genre } = useParams<{ genre: string }>()
  const decodedGenre = decodeURIComponent(genre ?? '')
  const { currentTrack, isPlaying, playQueue, togglePlay, playNext, addToQueue } = usePlayer()
  const [scrollY, setScrollY] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [addMenuSongId, setAddMenuSongId] = useState<string | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)

  const { data: songs, isLoading } = useFetch(() => getSongsByGenre(decodedGenre, 200), [decodedGenre])
  const { data: starred } = useFetch(getStarred, [])
  const starredIds = new Set(starred?.song?.map((s) => s.id) ?? [])

  const gradient = getGradient(decodedGenre)
  const isThisListPlaying = (songs ?? []).some((s) => s.id === currentTrack?.id) && isPlaying

  const toggleStar = async (songId: string) => {
    const isStarred = starredIds.has(songId) || likedSongs.has(songId)
    if (isStarred) {
      await unstar(songId); setLikedSongs((s) => { const n = new Set(s); n.delete(songId); return n })
    } else {
      await star(songId); setLikedSongs((s) => new Set(s).add(songId))
    }
  }

  return (
    <>
    <div
      className="h-full overflow-y-auto"
      onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
    >
      <div className={`relative bg-gradient-to-b ${gradient} via-[#121212]/60 to-[#121212]`}>
        <TopBar scrolled={scrollY > 60} />
        <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
          <div className={`w-36 h-36 sm:w-52 sm:h-52 flex-shrink-0 shadow-2xl rounded-md overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center self-center sm:self-auto`}>
            <Disc3 size={64} className="text-white opacity-80" />
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Genre</p>
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-none">{decodedGenre}</h1>
            <p className="text-sm text-[#a7a7a7]">{songs?.length ?? 0} songs</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => {
            if (!songs?.length) return
            if (isThisListPlaying) togglePlay()
            else playQueue(songs, 0)
          }}
          disabled={isLoading || !songs?.length}
          className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform hover:bg-[#1ed760] shadow-xl disabled:opacity-40"
        >
          {isThisListPlaying
            ? <Pause size={24} fill="black" className="text-black" />
            : <Play size={24} fill="black" className="text-black translate-x-0.5" />}
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-2 text-xs uppercase tracking-widest text-[#a7a7a7] border-b border-white/10 mb-2">
          <span className="text-right">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="flex justify-end"><Clock size={14} /></span>
        </div>

        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-[#282828] rounded" />
                <div className="h-4 bg-[#282828] rounded" />
                <div className="h-4 bg-[#282828] rounded hidden md:block" />
                <div className="h-4 bg-[#282828] rounded" />
              </div>
            ))
          : (songs ?? []).map((song, idx) => {
              const isActive = song.id === currentTrack?.id
              const isStarred = starredIds.has(song.id) || likedSongs.has(song.id)
              const cover = getCoverArtUrl(song.coverArt, 40)

              return (
                <div
                  key={song.id}
                  className="group grid grid-cols-[16px_1fr_1fr_80px] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/5 transition-colors"
                  onMouseEnter={() => setHoveredId(song.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    onClick={() => {
                      if (isActive) togglePlay()
                      else playQueue(songs ?? [], idx)
                    }}
                    className="flex items-center justify-center"
                  >
                    {hoveredId === song.id ? (
                      isActive && isPlaying ? (
                        <Pause size={12} fill="currentColor" className="text-white" />
                      ) : (
                        <Play size={12} fill="currentColor" className="text-white" />
                      )
                    ) : (
                      <span className={cn('text-xs', isActive ? 'text-[#1db954]' : 'text-[#a7a7a7]')}>
                        {isActive && isPlaying ? '▶' : idx + 1}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded overflow-hidden bg-[#282828] flex-shrink-0">
                      {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isActive ? 'text-[#1db954]' : 'text-white')}>
                        {song.title}
                      </p>
                      <Link to={`/artist/${song.artistId}`} className="text-xs text-[#a7a7a7] hover:underline truncate block">
                        {song.artist}
                      </Link>
                    </div>
                  </div>

                  <Link to={`/album/${song.albumId}`} className="text-xs text-[#a7a7a7] hover:underline hidden md:block truncate">
                    {song.album}
                  </Link>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleStar(song.id)}
                      className={cn('opacity-0 group-hover:opacity-100 transition-opacity', isStarred && 'opacity-100')}
                    >
                      <Heart size={14} fill={isStarred ? '#1db954' : 'none'} className={isStarred ? 'text-[#1db954]' : 'text-[#a7a7a7]'} />
                    </button>
                    <span className="text-xs text-[#a7a7a7]">{fmt(song.duration)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[#a7a7a7] hover:text-white">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#282828] border-white/10 text-white">
                        <DropdownMenuItem onClick={() => playNext([song])} className="hover:bg-white/10 cursor-pointer">
                          Play next
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addToQueue([song])} className="hover:bg-white/10 cursor-pointer">
                          Add to queue
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { setAddMenuSongId(song.id); setAddMenuAnchor(e.currentTarget as HTMLElement) }}
                          className="hover:bg-white/10 cursor-pointer"
                        >
                          Add to playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStar(song.id)} className="hover:bg-white/10 cursor-pointer">
                          {isStarred ? 'Remove from liked' : 'Add to liked songs'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
    <AddToPlaylistMenu
      songId={addMenuSongId ?? ''}
      open={!!addMenuSongId}
      anchorEl={addMenuAnchor}
      onClose={() => { setAddMenuSongId(null); setAddMenuAnchor(null) }}
    />
    </>
  )
}
