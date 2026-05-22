import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, Pause, Heart, MoreHorizontal, Clock, Download, Share2, ListPlus, SkipForward, List, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getAlbum, getStarred, star, unstar, getCoverArtUrl, getDownloadUrl, setRating } from '@/lib/subsonic'
import { usePlayer } from '@/contexts/PlayerContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
import { QualityBadge } from '@/components/QualityBadge'
import { CollapsibleComment } from '@/components/CollapsibleComment'
import { AlbumExternalLinks } from '@/components/ExternalLinks'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { ShareDialog } from '@/components/ShareDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const { currentTrack, isPlaying, playQueue, togglePlay, playNext, addToQueue } = usePlayer()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [saved, setSaved] = useState(false)
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [songRatings, setSongRatings] = useState<Record<string, number>>({})
  // "Add to playlist" menu state
  const [addMenuSongId, setAddMenuSongId] = useState<string | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const { enableSharing, enableStarRating } = useServerConfig()

  const handleRateSong = async (songId: string, rating: number) => {
    const prev = songRatings[songId] ?? 0
    const newRating = rating === prev ? 0 : rating
    setSongRatings((r) => ({ ...r, [songId]: newRating }))
    try {
      await setRating(songId, newRating)
    } catch {
      setSongRatings((r) => ({ ...r, [songId]: prev }))
    }
  }

  const { data: album, isLoading } = useFetch(() => getAlbum(id!), [id])
  const { data: starred } = useFetch(getStarred, [])
  const starredIds = new Set(starred?.song?.map((s) => s.id) ?? [])
  const tracks = album?.song ?? []
  const cover = getCoverArtUrl(album?.coverArt, 300)

  const toggleStar = async (songId: string) => {
    const isStarred = starredIds.has(songId) || likedSongs.has(songId)
    if (isStarred) {
      await unstar(songId); setLikedSongs((s) => { const n = new Set(s); n.delete(songId); return n })
    } else {
      await star(songId); setLikedSongs((s) => new Set(s).add(songId))
    }
  }

  const totalSecs = tracks.reduce((acc, t) => acc + t.duration, 0)
  const totalFmt = `about ${Math.floor(totalSecs / 60)} min`

  return (
    <div className="h-full overflow-y-auto" onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}>
      <div className="relative bg-gradient-to-b from-[#2d0b0b] via-[#1a0000]/70 to-[#121212]">
        <TopBar scrolled={scrollY > 280} bgColor="#2d0b0b" />
        {isLoading ? (
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
            <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-md bg-[#282828] animate-pulse flex-shrink-0 self-center sm:self-auto" />
            <div className="flex-1 space-y-3 pb-2">
              <div className="h-4 bg-[#282828] rounded w-16 animate-pulse" />
              <div className="h-12 bg-[#282828] rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-[#282828] rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
            <div className="w-36 h-36 sm:w-52 sm:h-52 flex-shrink-0 shadow-2xl rounded-md overflow-hidden self-center sm:self-auto">
              {cover ? (
                <img src={cover} alt={album?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-600 to-black flex items-center justify-center text-6xl">♫</div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Album</p>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-none">{album?.name}</h1>
              <div className="flex items-center gap-2 text-sm text-[#a7a7a7] flex-wrap">
                <Link to={`/artist/${album?.artistId}`} className="font-bold text-white hover:underline">{album?.artist}</Link>
                <span>·</span>
                {album?.year && <><span>{album.year}</span><span>·</span></>}
                <span>{tracks.length} songs,</span>
                <span>{totalFmt}</span>
              </div>
              {album?.comment && (
                <CollapsibleComment comment={album.comment} className="mt-2 max-w-xl" />
              )}
              <AlbumExternalLinks
                albumArtist={album?.artist}
                albumName={album?.name}
                mbzAlbumId={album?.musicBrainzId}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 py-4 flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => {
            const isThisAlbum = tracks.some((t) => t.id === currentTrack?.id)
            if (isThisAlbum) togglePlay()
            else playQueue(tracks, 0)
          }}
          className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform hover:bg-[#1ed760] shadow-xl"
        >
          {tracks.some((t) => t.id === currentTrack?.id) && isPlaying
            ? <Pause size={24} fill="black" className="text-black" />
            : <Play size={24} fill="black" className="text-black translate-x-0.5" />}
        </button>
        <button onClick={() => setSaved((s) => !s)} className={cn('transition-colors', saved ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white')}>
          <Heart size={32} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => { const a = document.createElement('a'); a.href = getDownloadUrl(id!); a.click() }}
          title="Download album"
          className="text-[#a7a7a7] hover:text-white transition-colors"
        ><Download size={20} /></button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-[#a7a7a7] hover:text-white transition-colors"><MoreHorizontal size={24} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#282828] border-white/10 text-white">
            <DropdownMenuItem
              className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
              onClick={() => navigator.clipboard.writeText(window.location.href)}
            >
              <Share2 size={14} className="mr-2" /> Copy link
            </DropdownMenuItem>
            {enableSharing && (
              <DropdownMenuItem
                className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                onClick={() => setShareOpen(true)}
              >
                <Share2 size={14} className="mr-2" /> Create share link
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
              onClick={() => { const a = document.createElement('a'); a.href = getDownloadUrl(id!); a.click() }}
            >
              <Download size={14} className="mr-2" /> Download album
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-[16px_1fr_auto_60px] gap-4 px-4 py-2 text-xs uppercase tracking-widest text-[#a7a7a7] border-b border-white/10 mb-2">
          <span className="text-right">#</span><span>Title</span><span></span><span className="flex justify-end"><Clock size={14} /></span>
        </div>

        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[16px_1fr_60px] gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-[#282828] rounded" /><div className="h-4 bg-[#282828] rounded" /><div className="h-4 bg-[#282828] rounded" />
              </div>
            ))
          : tracks.map((track) => {
              const isSongLiked = starredIds.has(track.id) || likedSongs.has(track.id)
              const songRating = songRatings[track.id] ?? track.userRating ?? 0
              return (
                <div
                  key={track.id}
                  className={cn('grid grid-cols-[16px_1fr_auto_60px] gap-4 items-center px-4 py-2 rounded-md group cursor-pointer', currentTrack?.id === track.id ? 'bg-white/10' : 'hover:bg-white/5')}
                  onMouseEnter={() => setHoveredId(track.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onDoubleClick={() => playQueue(tracks, tracks.indexOf(track))}
                >
                  <div className="flex items-center justify-end">
                    {hoveredId === track.id ? (
                      <button
                        onClick={() =>
                          currentTrack?.id === track.id ? togglePlay() : playQueue(tracks, tracks.indexOf(track))
                        }
                        className="text-white"
                      >
                        {currentTrack?.id === track.id && isPlaying
                          ? <Pause size={14} fill="currentColor" />
                          : <Play size={14} fill="currentColor" />}
                      </button>
                    ) : currentTrack?.id === track.id ? (
                      <span className="text-[#1db954] text-xs">{isPlaying ? '♫' : '▐▐'}</span>
                    ) : (
                      <span className="text-sm text-[#a7a7a7]">{track.track ?? '·'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium truncate', currentTrack?.id === track.id ? 'text-[#1db954]' : 'text-white')}>{track.title}</p>
                    <p className="text-xs text-[#a7a7a7] truncate hover:text-white cursor-pointer">{track.artist}</p>
                  </div>
                  {/* Quality badge + star rating */}
                  <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {enableStarRating && (
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); handleRateSong(track.id, s) }}
                            className="transition-colors">
                            <Star size={11} fill={songRating >= s ? '#f59b23' : 'none'}
                              className={songRating >= s ? 'text-[#f59b23]' : 'text-[#a7a7a7]'} />
                          </button>
                        ))}
                      </div>
                    )}
                    <QualityBadge suffix={track.suffix} bitRate={track.bitRate} />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleStar(track.id)}
                      className={cn('opacity-0 group-hover:opacity-100 transition-opacity', isSongLiked ? 'text-[#1db954] opacity-100' : 'text-[#a7a7a7] hover:text-white')}
                    >
                      <Heart size={14} fill={isSongLiked ? 'currentColor' : 'none'} />
                    </button>
                    <span className="text-sm text-[#a7a7a7]">{fmt(track.duration)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a7a7a7] hover:text-white">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#282828] border-white/10 text-white">
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                          onClick={() => playNext([track])}
                        >
                          <SkipForward size={14} className="mr-2" /> Play next
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                          onClick={() => addToQueue([track])}
                        >
                          <List size={14} className="mr-2" /> Add to queue
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                          onClick={() => { setAddMenuSongId(track.id); setAddMenuAnchor(null) }}
                        >
                          <ListPlus size={14} className="mr-2" /> Add to playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                          onClick={() => toggleStar(track.id)}
                        >
                          <Heart size={14} className="mr-2" /> {isSongLiked ? 'Remove from liked' : 'Add to liked'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                          onClick={() => { const a = document.createElement('a'); a.href = getDownloadUrl(track.id); a.click() }}
                        >
                          <Download size={14} className="mr-2" /> Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}

        {album && (
          <div className="mt-6 px-4 text-[#a7a7a7] text-xs space-y-1">
            {album.year && <p>{album.year}</p>}
            {album.genre && <p>{album.genre}</p>}
          </div>
        )}
      </div>

      <AddToPlaylistMenu
        songId={addMenuSongId ?? ''}
        open={!!addMenuSongId}
        anchorEl={addMenuAnchor}
        onClose={() => { setAddMenuSongId(null); setAddMenuAnchor(null) }}
      />
      <ShareDialog
        resourceIds={id ?? ''}
        name={album?.name ?? 'Album'}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}
