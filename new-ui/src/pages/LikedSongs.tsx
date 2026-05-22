import { useState } from 'react'
import { Play, Pause, Heart, Clock, MoreHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getStarred, unstar, getCoverArtUrl } from '@/lib/subsonic'
import { usePlayer } from '@/contexts/PlayerContext'
import { useToast } from '@/contexts/ToastContext'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

export default function LikedSongsPage() {
  const { currentTrack, isPlaying, playQueue, togglePlay } = usePlayer()
  const toast = useToast()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [localUnliked, setLocalUnliked] = useState<Set<string>>(new Set())
  const [addMenuSongId, setAddMenuSongId] = useState<string | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)

  const { data: starred, isLoading, refetch } = useFetch(getStarred, [])

  const allSongs = starred?.song ?? []
  const songs = allSongs.filter((s) => !localUnliked.has(s.id))

  const isThisListPlaying = songs.some((s) => s.id === currentTrack?.id) && isPlaying

  const handleUnstar = async (songId: string) => {
    setLocalUnliked((s) => new Set(s).add(songId))
    try {
      await unstar(songId)
      toast.success('Removed from liked songs')
      refetch()
    } catch {
      setLocalUnliked((s) => { const n = new Set(s); n.delete(songId); return n })
      toast.error('Failed to remove from liked songs')
    }
  }

  return (
    <>
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#450af5] via-[#2d0f99]/70 to-[#121212]">
        <TopBar scrolled={false} bgColor="#450af5" />
        <div className="px-4 sm:px-6 pb-8 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
          <div className="w-36 h-36 sm:w-52 sm:h-52 flex-shrink-0 shadow-2xl rounded-md overflow-hidden bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center self-center sm:self-auto">
            <Heart size={56} fill="white" className="text-white" />
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Playlist</p>
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-none">Liked Songs</h1>
            <div className="flex items-center gap-1 text-sm text-[#a7a7a7]">
              <span>{songs.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 sm:px-6 py-4 flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => {
            if (songs.length === 0) return
            if (isThisListPlaying) togglePlay()
            else playQueue(songs, 0)
          }}
          disabled={songs.length === 0 && !isLoading}
          className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform hover:bg-[#1ed760] shadow-xl disabled:opacity-40"
        >
          {isThisListPlaying
            ? <Pause size={24} fill="black" className="text-black" />
            : <Play size={24} fill="black" className="text-black translate-x-0.5" />}
        </button>
      </div>

      {/* Track list */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-[16px_1fr_80px] md:grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-2 text-xs uppercase tracking-widest text-[#a7a7a7] border-b border-white/10 mb-2">
          <span className="text-right">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="flex justify-end"><Clock size={14} /></span>
        </div>

        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[16px_1fr_80px] md:grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-[#282828] rounded" />
                <div className="h-4 bg-[#282828] rounded" />
                <div className="h-4 bg-[#282828] rounded hidden md:block" />
                <div className="h-4 bg-[#282828] rounded" />
              </div>
            ))
          : songs.length === 0
          ? (
            <div className="text-center py-16">
              <Heart size={48} className="text-[#a7a7a7] mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">Songs you like will appear here</p>
              <p className="text-[#a7a7a7] text-sm">Save songs by tapping the heart icon</p>
            </div>
          )
          : songs.map((track, idx) => {
              const isActive = currentTrack?.id === track.id
              const isHovered = hoveredId === track.id
              const cover = getCoverArtUrl(track.coverArt, 40)
              return (
                <div
                  key={track.id}
                  className={cn('grid grid-cols-[16px_1fr_80px] md:grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-2 rounded-md group cursor-pointer', isActive ? 'bg-white/10' : 'hover:bg-white/5')}
                  onMouseEnter={() => setHoveredId(track.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onDoubleClick={() => playQueue(songs, idx)}
                >
                  <div className="flex items-center justify-end">
                    {isHovered ? (
                      <button onClick={() => isActive ? togglePlay() : playQueue(songs, idx)} className="text-white">
                        {isActive && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      </button>
                    ) : isActive ? (
                      <span className="text-[#1db954] text-xs">{isPlaying ? '♫' : '▐▐'}</span>
                    ) : (
                      <span className="text-sm text-[#a7a7a7]">{idx + 1}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[#282828] rounded flex-shrink-0 overflow-hidden">
                      {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm">♫</div>}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isActive ? 'text-[#1db954]' : 'text-white')}>{track.title}</p>
                      <Link to={`/artist/${track.artistId}`} onClick={(e) => e.stopPropagation()} className="text-xs text-[#a7a7a7] truncate hover:underline hover:text-white">{track.artist}</Link>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center min-w-0">
                    <Link to={`/album/${track.albumId}`} onClick={(e) => e.stopPropagation()} className="text-sm text-[#a7a7a7] truncate hover:text-white hover:underline">{track.album}</Link>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnstar(track.id) }}
                      className="text-[#1db954] opacity-100 transition-opacity hover:scale-110"
                      title="Remove from liked songs"
                    >
                      <Heart size={14} fill="currentColor" />
                    </button>
                    <span className="text-sm text-[#a7a7a7] tabular-nums">{fmt(track.duration)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddMenuSongId(track.id); setAddMenuAnchor(e.currentTarget) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a7a7a7] hover:text-white"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
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
