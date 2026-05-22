import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Play, Pause, Heart, MoreHorizontal, Clock, Pencil, Trash2, ListPlus, AlertTriangle, ImagePlus, Share2, Lock, LockOpen, Star, SkipForward, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getPlaylist, getStarred, star, unstar, deletePlaylist, updatePlaylist, getCoverArtUrl, setRating } from '@/lib/subsonic'
import { uploadPlaylistImage } from '@/lib/api'
import { usePlayer } from '@/contexts/PlayerContext'
import { useAuth } from '@/contexts/AuthContext'
import { useServerConfig } from '@/contexts/ServerConfigContext'
import { useToast } from '@/contexts/ToastContext'
import { QualityBadge } from '@/components/QualityBadge'
import { CollapsibleComment } from '@/components/CollapsibleComment'
import { PlaylistModal } from '@/components/playlist/PlaylistModal'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { ShareDialog } from '@/components/ShareDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

function formatDuration(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

function totalDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h} hr ${m} min` : `${m} min`
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrack, isPlaying, playQueue, togglePlay, playNext, addToQueue } = usePlayer()
  const { user } = useAuth()
  const toast = useToast()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [songRatings, setSongRatings] = useState<Record<string, number>>({})
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [addMenuSongId, setAddMenuSongId] = useState<string | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
  const [removedIdxs, setRemovedIdxs] = useState<Set<number>>(new Set())
  const [shareOpen, setShareOpen] = useState(false)
  const { enableSharing, enableStarRating } = useServerConfig()
  const imgInputRef = useRef<HTMLInputElement>(null)

  const { data: playlist, isLoading, refetch } = useFetch(() => getPlaylist(id!), [id])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await uploadPlaylistImage(id!, file)
      toast.success('Cover image updated')
      refetch()
    } catch {
      toast.error('Failed to upload image')
    }
  }
  const { data: starred } = useFetch(getStarred, [])

  const starredIds = new Set(starred?.song?.map((s) => s.id) ?? [])
  const allTracks = playlist?.entry ?? []
  const tracks = allTracks.filter((_, i) => !removedIdxs.has(i))
  const cover = getCoverArtUrl(playlist?.coverArt, 300)

  // Reset removedIdxs when playlist id changes
  useEffect(() => { setRemovedIdxs(new Set()) }, [id])

  const handleRemoveTrack = async (idx: number) => {
    if (!id) return
    // Optimistic update
    setRemovedIdxs((s) => new Set(s).add(idx))
    try {
      await updatePlaylist(id, { songIndexToRemove: [idx] })
      refetch()
    } catch {
      // Revert optimistic update on error
      setRemovedIdxs((s) => { const n = new Set(s); n.delete(idx); return n })
    }
  }

  const handleTogglePublic = async () => {
    if (!id || !playlist) return
    try {
      await updatePlaylist(id, { public: !playlist.public })
      toast.success(playlist.public ? 'Playlist is now private' : 'Playlist is now public')
      refetch()
    } catch {
      toast.error('Failed to update playlist visibility')
    }
  }

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

  const handleDeletePlaylist = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await deletePlaylist(id)
      navigate('/library')
    } catch {
      setIsDeleting(false)
      setDeleteConfirm(false)
    }
  }

  return (
    <>
    <div
      className="h-full overflow-y-auto"
      onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
    >
      <div className="relative bg-gradient-to-b from-[#1a1a2e] via-[#121212]/70 to-[#121212]">
        <TopBar scrolled={scrollY > 280} bgColor="#1a1a2e" />

        {isLoading ? (
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
            <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-md bg-[#282828] animate-pulse flex-shrink-0 self-center sm:self-auto" />
            <div className="flex-1 space-y-3 pb-2">
              <div className="h-4 bg-[#282828] rounded w-20 animate-pulse" />
              <div className="h-12 bg-[#282828] rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-[#282828] rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 pb-6 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pt-4 sm:pt-0">
            <div className="w-36 h-36 sm:w-52 sm:h-52 flex-shrink-0 shadow-2xl rounded-md overflow-hidden self-center sm:self-auto">
              {cover ? (
                <img src={cover} alt={playlist?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-900 flex items-center justify-center text-6xl">♫</div>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">Playlist</p>
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-none">{playlist?.name}</h1>
              {playlist?.comment && <p className="text-sm text-white/70 mb-1">{playlist.comment}</p>}
              {playlist?.comment && (
                <CollapsibleComment comment={playlist.comment} className="mt-2 max-w-xl" />
              )}
              <div className="flex items-center gap-1 text-sm text-[#a7a7a7]">
                <span className="font-semibold text-white">{playlist?.owner}</span>
                <span>·</span>
                <span>{tracks.length} songs,</span>
                <span>{totalDuration(playlist?.duration ?? 0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 sm:px-6 py-4 flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => {
            const isThisPlaylist = tracks.some((t) => t.id === currentTrack?.id)
            if (isThisPlaylist) togglePlay()
            else playQueue(tracks, 0)
          }}
          className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform hover:bg-[#1ed760] shadow-xl"
        >
          {tracks.some((t) => t.id === currentTrack?.id) && isPlaying
            ? <Pause size={24} fill="black" className="text-black" />
            : <Play size={24} fill="black" className="text-black translate-x-0.5" />}
        </button>
        <button onClick={() => setLiked((l) => !l)} className={cn('transition-colors', liked ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white')}>
          <Heart size={32} fill={liked ? 'currentColor' : 'none'} />
        </button>

        {/* Main playlist options menu */}
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-[#a7a7a7] hover:text-white transition-colors">
              <MoreHorizontal size={24} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-[#282828] border-white/10 text-white">
            {user?.isAdmin && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                  onClick={() => imgInputRef.current?.click()}
                >
                  <ImagePlus size={14} className="mr-2" /> Upload image
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
              </>
            )}
            <DropdownMenuItem
              className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
              onClick={() => setRenameOpen(true)}
            >
              <Pencil size={14} className="mr-2" /> Rename playlist
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
              onClick={handleTogglePublic}
            >
              {playlist?.public
                ? <><Lock size={14} className="mr-2" /> Make private</>
                : <><LockOpen size={14} className="mr-2" /> Make public</>}
            </DropdownMenuItem>
            {enableSharing && (
              <>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 size={14} className="mr-2" /> Share playlist
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:bg-white/10 focus:bg-white/10 focus:text-red-400"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 size={14} className="mr-2" /> Delete playlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(false)}>
        <DialogContent className="bg-[#282828] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" /> Delete playlist?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#a7a7a7]">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              Cancel
            </Button>
            <Button
              onClick={handleDeletePlaylist}
              disabled={isDeleting}
              className="rounded-full bg-red-500 text-white hover:bg-red-400"
            >
              {isDeleting ? '…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-[16px_1fr_1fr_auto_80px] md:grid-cols-[16px_1fr_1fr_auto_80px] gap-4 px-4 py-2 text-xs uppercase tracking-widest text-[#a7a7a7] border-b border-white/10 mb-2">
          <span className="text-right">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span></span>
          <span className="flex justify-end"><Clock size={14} /></span>
        </div>

        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[16px_1fr_auto_80px] md:grid-cols-[16px_1fr_1fr_auto_80px] gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-[#282828] rounded" />
                <div className="h-4 bg-[#282828] rounded" />
                <div className="h-4 bg-[#282828] rounded hidden md:block" />
                <div className="h-4 bg-[#282828] rounded" />
                <div className="h-4 bg-[#282828] rounded" />
              </div>
            ))
          : tracks.map((track, idx) => {
              const isSongLiked = starredIds.has(track.id) || likedSongs.has(track.id)
              const songRating = songRatings[track.id] ?? track.userRating ?? 0
              return (
                <div
                  key={track.id}
                  className={cn('grid grid-cols-[16px_1fr_auto_80px] md:grid-cols-[16px_1fr_1fr_auto_80px] gap-4 px-4 py-2 rounded-md group cursor-pointer', currentTrack?.id === track.id ? 'bg-white/10' : 'hover:bg-white/5')}
                  onMouseEnter={() => setHoveredId(track.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onDoubleClick={() => playQueue(tracks, idx)}
                >
                  <div className="flex items-center justify-end">
                    {hoveredId === track.id ? (
                      <button
                        onClick={() =>
                          currentTrack?.id === track.id ? togglePlay() : playQueue(tracks, idx)
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
                      <span className="text-sm text-[#a7a7a7]">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[#282828] rounded flex-shrink-0 overflow-hidden">
                      {track.coverArt ? (
                        <img src={getCoverArtUrl(track.coverArt, 40)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">♫</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', currentTrack?.id === track.id ? 'text-[#1db954]' : 'text-white')}>{track.title}</p>
                      <p className="text-xs text-[#a7a7a7] truncate hover:text-white cursor-pointer">{track.artist}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center min-w-0">
                    <span className="text-sm text-[#a7a7a7] truncate hover:text-white hover:underline cursor-pointer">{track.album}</span>
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
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isSongLiked) {
                          unstar(track.id); setLikedSongs((s) => { const n = new Set(s); n.delete(track.id); return n })
                        } else {
                          star(track.id); setLikedSongs((s) => new Set(s).add(track.id))
                        }
                      }}
                      className={cn('opacity-0 group-hover:opacity-100 transition-opacity', isSongLiked ? 'text-[#1db954] opacity-100' : 'text-[#a7a7a7] hover:text-white')}
                    >
                      <Heart size={14} fill={isSongLiked ? 'currentColor' : 'none'} />
                    </button>
                    <span className="text-sm text-[#a7a7a7]">{formatDuration(track.duration)}</span>
                    {/* Per-track context menu */}
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
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          className="cursor-pointer text-red-400 hover:bg-white/10 focus:bg-white/10 focus:text-red-400"
                          onClick={(e) => { e.stopPropagation(); handleRemoveTrack(idx) }}
                        >
                          <Trash2 size={14} className="mr-2" /> Remove from playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
      </div>
    </div>

    <PlaylistModal
      open={renameOpen}
      mode="rename"
      playlistId={id}
      currentName={playlist?.name ?? ''}
      onClose={() => setRenameOpen(false)}
      onRenamed={refetch}
    />
    <AddToPlaylistMenu
      songId={addMenuSongId ?? ''}
      open={!!addMenuSongId}
      anchorEl={addMenuAnchor}
      onClose={() => { setAddMenuSongId(null); setAddMenuAnchor(null) }}
    />
    <ShareDialog
      resourceIds={playlist?.id ?? ''}
      name={playlist?.name ?? 'Playlist'}
      open={shareOpen}
      onClose={() => setShareOpen(false)}
    />
    </>
  )
}
