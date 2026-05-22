import { useState, useEffect, useRef } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Mic2, ListMusic, Heart, Download, Star, ListPlus, Bookmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlayer } from '@/contexts/PlayerContext'
import { useToast } from '@/contexts/ToastContext'
import { getCoverArtUrl, getDownloadUrl, getLyricsBySongId, createPlaylist, updatePlaylist, createBookmark, deleteBookmark, getBookmarks, type SubsonicLyrics } from '@/lib/subsonic'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/contexts/I18nContext'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatTime(secs: number) {
  if (!isFinite(secs) || secs < 0) return '0:00'
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

// ─── Queue Drawer ─────────────────────────────────────────────────────────────

function SaveQueueDialog({ open, onClose, queue }: {
  open: boolean
  onClose: () => void
  queue: ReturnType<typeof usePlayer>['queue']
}) {
  const toast = useToast()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const playlist = await createPlaylist(name.trim())
      if (queue.length > 0) {
        await updatePlaylist(playlist.id, { songIdToAdd: queue.map((t) => t.id) })
      }
      toast.success(`Playlist "${name}" created`)
      setName('')
      onClose()
    } catch {
      toast.error('Failed to create playlist')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setName(''); onClose() } }}>
      <DialogContent className="bg-[#282828] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('player.saveQueueTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-white text-sm">{t('player.playlistName')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !saving && name.trim() && handleSave()}
              placeholder="My playlist…"
              className="bg-[#3e3e3e] border-white/20 text-white"
              autoFocus
            />
          </div>
          <p className="text-xs text-[#a7a7a7]">{t(queue.length === 1 ? 'player.trackCount' : 'player.trackCountPlural', { count: queue.length })}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setName(''); onClose() }} className="text-[#a7a7a7]">{t('player.cancel')}</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="bg-[#1db954] text-black hover:bg-[#1ed760] font-semibold"
          >
            {saving ? t('player.saving') : t('player.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, currentIndex, playQueue } = usePlayer()
  const { t } = useTranslation()
  const [saveOpen, setSaveOpen] = useState(false)
  return (
    <>
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose() }} direction="right">
      <DrawerContent className="bg-[#1a1a1a] border-l border-white/10 flex flex-col h-full w-80 max-w-[85vw] p-0">
        <DrawerHeader className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-sm font-bold text-white">{t('player.queueTitle')}</DrawerTitle>
            <div className="flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={() => setSaveOpen(true)}
                  title={t('player.saveQueue')}
                  className="text-[#a7a7a7] hover:text-white transition-colors"
                >
                  <ListPlus size={16} />
                </button>
              )}
              <span className="text-xs text-[#a7a7a7]">{t(queue.length === 1 ? 'player.trackCount' : 'player.trackCountPlural', { count: queue.length })}</span>
            </div>
          </div>
        </DrawerHeader>
        <ScrollArea className="flex-1">
          {queue.length === 0 ? (
            <p className="text-center text-[#a7a7a7] text-sm py-8">{t('player.queueEmpty')}</p>
          ) : (
            queue.map((track, idx) => {
              const isActive = idx === currentIndex
              const cover = getCoverArtUrl(track.coverArt, 40)
              return (
                <button
                  key={`${track.id}-${idx}`}
                  onClick={() => playQueue(queue, idx)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition-colors',
                    isActive && 'bg-white/5',
                  )}
                >
                  <div className="w-9 h-9 flex-shrink-0 rounded bg-[#282828] overflow-hidden relative">
                    {cover
                      ? <img src={cover} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs">♫</div>}
                    {isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[#1db954] text-xs">▶</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs font-medium truncate', isActive ? 'text-[#1db954]' : 'text-white')}>{track.title}</p>
                    <p className="text-xs text-[#a7a7a7] truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-[#a7a7a7] flex-shrink-0">{formatTime(track.duration)}</span>
                </button>
              )
            })
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
    <SaveQueueDialog open={saveOpen} onClose={() => setSaveOpen(false)} queue={queue} />
    </>
  )
}

// ─── Lyrics Drawer ────────────────────────────────────────────────────────────

function LyricsDrawer({ open, onClose, songId }: { open: boolean; onClose: () => void; songId: string | null }) {
  const { t } = useTranslation()
  const [lyrics, setLyrics] = useState<SubsonicLyrics | null>(null)
  const [loading, setLoading] = useState(false)

  // Load lyrics when drawer opens
  useEffect(() => {
    if (!open || !songId) { setLyrics(null); return }
    setLoading(true)
    getLyricsBySongId(songId)
      .then(setLyrics)
      .catch(() => setLyrics(null))
      .finally(() => setLoading(false))
  }, [open, songId])

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose() }} direction="right">
      <DrawerContent className="bg-[#1a1a1a] border-l border-white/10 flex flex-col h-full w-80 max-w-[85vw] p-0">
        <DrawerHeader className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <DrawerTitle className="text-sm font-bold text-white">{t('player.lyricsTitle')}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 px-4 py-4">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-[#282828] rounded" style={{ width: `${60 + (i % 4) * 10}%` }} />
              ))}
            </div>
          ) : lyrics?.value ? (
            <pre className="text-sm text-[#a7a7a7] whitespace-pre-wrap font-sans leading-7">{lyrics.value}</pre>
          ) : lyrics?.line?.length ? (
            <div className="space-y-1">
              {lyrics.line.map((l, i) => (
                <p key={i} className="text-sm text-[#a7a7a7] leading-7">{l.value}</p>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#a7a7a7] text-sm py-8">{t('player.noLyrics')}</p>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating, onRate }: { rating: number; onRate: (r: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onRate(s === rating ? 0 : s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="transition-colors"
        >
          <Star
            size={12}
            fill={(hover || rating) >= s ? '#f59b23' : 'none'}
            className={(hover || rating) >= s ? 'text-[#f59b23]' : 'text-[#a7a7a7]'}
          />
        </button>
      ))}
    </div>
  )
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffleActive,
    repeatMode,
    isCurrentStarred,
    currentRating,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    next,
    prev,
    toggleShuffle,
    cycleRepeat,
    toggleStarCurrent,
    rateCurrentTrack,
  } = usePlayer()

  const toast = useToast()
  const { t } = useTranslation()
  const [queueOpen, setQueueOpen] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const bookmarkTrackIdRef = useRef<string | null>(null)

  // Sync bookmark state whenever track changes
  useEffect(() => {
    if (!currentTrack) { setBookmarked(false); bookmarkTrackIdRef.current = null; return }
    if (bookmarkTrackIdRef.current === currentTrack.id) return
    bookmarkTrackIdRef.current = currentTrack.id
    setBookmarked(false)
    getBookmarks()
      .then((bms) => {
        if (bookmarkTrackIdRef.current === currentTrack.id) {
          setBookmarked(bms.some((b) => b.entry.id === currentTrack.id))
        }
      })
      .catch(() => {})
  }, [currentTrack])

  const handleBookmark = async () => {
    if (!currentTrack) return
    try {
      if (bookmarked) {
        await deleteBookmark(currentTrack.id)
        setBookmarked(false)
        toast.success('Bookmark removed')
      } else {
        await createBookmark(currentTrack.id, Math.floor(currentTime * 1000))
        setBookmarked(true)
        toast.success(`Bookmarked at ${formatTime(currentTime)}`)
      }
    } catch {
      toast.error('Failed to update bookmark')
    }
  }

  const effectiveVolume = isMuted ? 0 : volume
  const cover = currentTrack ? getCoverArtUrl(currentTrack.coverArt, 80) : ''

  const VolumeIcon =
    effectiveVolume === 0 ? VolumeX : effectiveVolume < 40 ? Volume1 : Volume2

  const handleStarClick = async () => {
    if (!currentTrack) return
    try {
      await toggleStarCurrent()
      toast.success(isCurrentStarred ? 'Removed from liked songs' : 'Added to liked songs')
    } catch {
      toast.error('Failed to update liked songs')
    }
  }

  const handleDownload = () => {
    if (!currentTrack) return
    const a = document.createElement('a')
    a.href = getDownloadUrl(currentTrack.id)
    a.download = `${currentTrack.title}.${currentTrack.suffix ?? 'mp3'}`
    a.click()
  }

  const handleRate = async (r: number) => {
    try {
      await rateCurrentTrack(r)
    } catch {
      toast.error('Failed to set rating')
    }
  }

  return (
    <>
    <footer className="bg-[#181818] border-t border-white/10 flex-shrink-0 z-50">

      {/* ── Mobile compact bar ─────────────────────────────────────── */}
      <div className="md:hidden relative">
        {/* Draggable progress slider */}
        <div className="absolute top-0 left-0 right-0 px-0">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={1}
            onValueChange={([v]) => seek(v)}
            className="h-1 [&>span:first-child]:h-1 [&>span:first-child]:rounded-none [&>span:first-child]:bg-white/10 [&_[role=slider]]:hidden [&>span:first-child>span]:bg-[#1db954] [&>span:first-child>span]:rounded-none"
          />
        </div>

        <div className="flex items-center gap-3 px-3 h-[64px]">
          {/* Cover */}
          <Link
            to={currentTrack ? `/album/${currentTrack.albumId}` : '#'}
            className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-[#282828]"
          >
            {cover
              ? <img src={cover} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-[#450af5] via-[#c4efd9] to-[#1db954] flex items-center justify-center"><span className="text-white text-sm">♫</span></div>}
          </Link>

          {/* Title / Artist */}
          <div className="flex-1 min-w-0">
            {currentTrack ? (
              <>
                <p className="text-sm font-medium text-white truncate leading-tight">{currentTrack.title}</p>
                <p className="text-xs text-[#a7a7a7] truncate">{currentTrack.artist}</p>
              </>
            ) : (
              <p className="text-xs text-[#a7a7a7]">No track selected</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleStarClick}
              disabled={!currentTrack}
              className={cn('p-2 disabled:opacity-30', isCurrentStarred ? 'text-[#1db954]' : 'text-[#a7a7a7]')}
            >
              <Heart size={18} fill={isCurrentStarred ? 'currentColor' : 'none'} />
            </button>
            <button onClick={prev} className="p-2 text-white">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black disabled:opacity-40"
            >
              {isPlaying
                ? <Pause size={18} fill="currentColor" />
                : <Play size={18} fill="currentColor" className="translate-x-0.5" />}
            </button>
            <button onClick={next} className="p-2 text-white">
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop full bar ───────────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between h-[90px] px-4">
      {/* Left: Now Playing */}
      <div className="flex items-center gap-3 w-[280px] min-w-0">
        {currentTrack ? (
          <Link to={`/album/${currentTrack.albumId}`} className="w-14 h-14 rounded flex-shrink-0 overflow-hidden bg-[#282828] hover:opacity-80 transition-opacity">
            {cover
              ? <img src={cover} alt={currentTrack.album} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-[#450af5] via-[#c4efd9] to-[#1db954] flex items-center justify-center"><span className="text-white font-bold text-lg">♫</span></div>}
          </Link>
        ) : (
          <div className="w-14 h-14 rounded flex-shrink-0 bg-[#282828]" />
        )}
        {currentTrack ? (
          <div className="min-w-0 flex-1">
            <Link to={`/album/${currentTrack.albumId}`} className="text-sm font-medium text-white truncate block hover:underline">{currentTrack.title}</Link>
            <Link to={`/artist/${currentTrack.artistId}`} className="text-xs text-[#a7a7a7] truncate block hover:underline hover:text-white">{currentTrack.artist}</Link>
            <StarRating rating={currentRating} onRate={handleRate} />
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#a7a7a7]">No track selected</p>
          </div>
        )}
        <button
          onClick={handleStarClick}
          disabled={!currentTrack}
          title={isCurrentStarred ? 'Remove from liked songs' : 'Add to liked songs'}
          className={cn(
            'flex-shrink-0 transition-colors disabled:opacity-30',
            isCurrentStarred ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white',
          )}
        >
          <Heart size={16} fill={isCurrentStarred ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Center: Transport */}
      <div className="flex flex-col items-center gap-1 flex-1 max-w-[600px] px-4">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleShuffle}
                className={cn(
                  'transition-colors relative',
                  shuffleActive ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white',
                )}
              >
                <Shuffle size={16} />
                {shuffleActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1db954] rounded-full" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('player.shuffle')} <kbd className="opacity-60 text-[10px]">Alt+S</kbd></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={prev} className="text-[#a7a7a7] hover:text-white transition-colors hover:scale-105">
                <SkipBack size={18} fill="currentColor" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('player.previous')} <kbd className="opacity-60 text-[10px]">Alt+←</kbd></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={togglePlay}
                disabled={!currentTrack}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="translate-x-0.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? t('action.pause') : t('action.play')} <kbd className="opacity-60 text-[10px]">Space</kbd></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={next} className="text-[#a7a7a7] hover:text-white transition-colors hover:scale-105">
                <SkipForward size={18} fill="currentColor" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('player.next')} <kbd className="opacity-60 text-[10px]">Alt+→</kbd></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cycleRepeat}
                className={cn(
                  'transition-colors relative',
                  repeatMode !== 'off' ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white',
                )}
              >
                {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                {repeatMode !== 'off' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1db954] rounded-full" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{repeatMode === 'one' ? 'Repeat one' : repeatMode === 'all' ? 'Repeat all' : 'Repeat off'}</TooltipContent>
          </Tooltip>
        </div>

        {/* Progress Slider */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-[#a7a7a7] w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={1}
            onValueChange={([v]) => seek(v)}
            className="flex-1"
          />
          <span className="text-xs text-[#a7a7a7] w-10 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume & extras */}
      <div className="flex items-center gap-2 w-[280px] justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setLyricsOpen((o) => !o)}
              disabled={!currentTrack}
              className={cn('transition-colors disabled:opacity-30', lyricsOpen ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white')}
            >
              <Mic2 size={16} />
            </button>
          </TooltipTrigger>
            <TooltipContent>{t('player.lyricsTitle')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setQueueOpen((o) => !o)}
              className={cn('transition-colors', queueOpen ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white')}
            >
              <ListMusic size={16} />
            </button>
          </TooltipTrigger>
            <TooltipContent>{t('player.queueTitle')}</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={toggleMute} className="text-[#a7a7a7] hover:text-white transition-colors">
                <VolumeIcon size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('player.mute')} <kbd className="opacity-60 text-[10px]">M</kbd></TooltipContent>
          </Tooltip>
          <Slider
            value={[effectiveVolume]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => setVolume(v)}
            className="w-24"
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleBookmark}
              disabled={!currentTrack}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark current position'}
              className={cn('transition-colors disabled:opacity-30', bookmarked ? 'text-[#1db954]' : 'text-[#a7a7a7] hover:text-white')}
            >
              <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{bookmarked ? 'Remove bookmark' : 'Bookmark current position'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDownload}
              disabled={!currentTrack}
              className="text-[#a7a7a7] hover:text-white transition-colors disabled:opacity-30 ml-1"
            >
              <Download size={16} />
            </button>
          </TooltipTrigger>
            <TooltipContent>{t('action.download')}</TooltipContent>
        </Tooltip>

      </div>
      </div>{/* end desktop bar */}
    </footer>
    <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    <LyricsDrawer open={lyricsOpen} onClose={() => setLyricsOpen(false)} songId={currentTrack?.id ?? null} />
    </>
  )
}
