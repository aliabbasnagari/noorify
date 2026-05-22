import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Music2 } from 'lucide-react'
import { getCoverArtUrl } from '@/lib/subsonic'

interface SharedTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  coverArt?: string
}

interface ShareData {
  id: string
  description?: string
  downloadable: boolean
  tracks: SharedTrack[]
}

function fmt(secs: number) {
  if (!isFinite(secs) || secs < 0) return '0:00'
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

// Spotify-style slider — shows filled portion and a thumb that appears on hover/drag
interface SliderBarProps {
  value: number
  max: number
  step?: number
  onChange: (v: number) => void
  className?: string
}
function SliderBar({ value, max, step = 1, onChange, className = '' }: SliderBarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [hover, setHover] = useState(false)

  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0

  const valueFromEvent = (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
    const rect = ref.current!.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const raw = ratio * max
    return step < 1 ? raw : Math.round(raw / step) * step
  }

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    onChange(valueFromEvent(e))
    const onMove = (ev: MouseEvent) => { if (dragging.current) onChange(valueFromEvent(ev)) }
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true
    onChange(valueFromEvent(e))
    const onMove = (ev: TouchEvent) => { if (dragging.current) onChange(valueFromEvent(ev)) }
    const onEnd = () => { dragging.current = false; window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
  }

  return (
    <div
      ref={ref}
      role="slider"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      tabIndex={0}
      className={`relative flex items-center h-4 cursor-pointer select-none ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onKeyDown={(e) => {
        const delta = max / 100
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + delta))
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0, value - delta))
      }}
    >
      {/* Track background */}
      <div className="absolute inset-x-0 h-1 rounded-full bg-white/20" />
      {/* Filled portion */}
      <div
        className="absolute left-0 h-1 rounded-full bg-[#1db954] transition-none"
        style={{ width: `${pct}%` }}
      />
      {/* Thumb — visible on hover/drag */}
      <div
        className="absolute w-3 h-3 rounded-full bg-white shadow-md transition-opacity"
        style={{
          left: `calc(${pct}% - 6px)`,
          opacity: hover || dragging.current ? 1 : 0,
        }}
      />
    </div>
  )
}

export default function SharePlayerPage() {
  const { id } = useParams<{ id: string }>()
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(70)
  const [audioEl] = useState(() => new Audio())

  useEffect(() => {
    // Fetch share info from the public (unauthenticated) endpoint
    fetch(`/share/${id}/info`)
      .then((r) => {
        if (r.status === 410) throw new Error('This share has expired')
        if (!r.ok) throw new Error('Share not found or expired')
        return r.json()
      })
      .then((data) => setShareData(data))
      .catch((e) => setError(e.message))
  }, [id])

  const currentTrack = shareData?.tracks[currentIndex]

  useEffect(() => {
    if (!currentTrack || !shareData) return
    // currentTrack.id is a signed JWT stream token; stream via /share/s/{token}
    audioEl.src = `/share/s/${currentTrack.id}`
    audioEl.load()
    if (isPlaying) audioEl.play().catch(() => setIsPlaying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  useEffect(() => {
    audioEl.volume = volume / 100
  }, [volume, audioEl])

  useEffect(() => {
    const onTime = () => setCurrentTime(audioEl.currentTime)
    const onMeta = () => setDuration(audioEl.duration)
    const onEnded = () => {
      if (shareData && currentIndex < shareData.tracks.length - 1) {
        setCurrentIndex((i) => i + 1)
      } else {
        setIsPlaying(false)
      }
    }
    audioEl.addEventListener('timeupdate', onTime)
    audioEl.addEventListener('loadedmetadata', onMeta)
    audioEl.addEventListener('ended', onEnded)
    return () => {
      audioEl.removeEventListener('timeupdate', onTime)
      audioEl.removeEventListener('loadedmetadata', onMeta)
      audioEl.removeEventListener('ended', onEnded)
    }
  }, [audioEl, shareData, currentIndex])

  const togglePlay = () => {
    if (isPlaying) {
      audioEl.pause()
    } else {
      if (!audioEl.src && shareData?.tracks.length) {
        audioEl.src = `/share/${shareData.id}/stream/${shareData.tracks[0].id}`
        audioEl.load()
      }
      audioEl.play().catch(() => {})
    }
    setIsPlaying((p) => !p)
  }

  const cover = currentTrack?.coverArt ? getCoverArtUrl(currentTrack.coverArt, 300) : ''

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Music2 size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-xl font-bold">{error}</p>
          <p className="text-[#a7a7a7] text-sm mt-2">This share link may have expired or been removed.</p>
        </div>
      </div>
    )
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-[#1db954] rounded-full flex items-center justify-center mx-auto mb-4">
            <Music2 size={20} className="text-black" />
          </div>
          <p className="text-[#a7a7a7] text-sm">Shared via Navidrome</p>
          {shareData.description && (
            <p className="text-white font-semibold mt-1">{shareData.description}</p>
          )}
        </div>

        {/* Album art */}
        <div className="w-64 h-64 mx-auto rounded-xl overflow-hidden shadow-2xl mb-6 bg-[#282828]">
          {cover ? (
            <img src={cover} alt={currentTrack?.album} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 size={64} className="text-[#a7a7a7]" />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white truncate">{currentTrack?.title}</h2>
          <p className="text-[#a7a7a7] text-sm truncate mt-1">{currentTrack?.artist}</p>
          <p className="text-[#a7a7a7] text-xs truncate">{currentTrack?.album}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <SliderBar
            value={currentTime}
            max={duration || 1}
            step={0.1}
            onChange={(v) => { audioEl.currentTime = v; setCurrentTime(v) }}
          />
          <div className="flex justify-between text-xs text-[#a7a7a7] mt-1.5">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="text-[#a7a7a7] hover:text-white disabled:opacity-30 transition-colors"
          >
            <SkipBack size={24} />
          </button>
          <button
            onClick={togglePlay}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause size={24} fill="black" className="text-black" />
            ) : (
              <Play size={24} fill="black" className="text-black translate-x-0.5" />
            )}
          </button>
          <button
            onClick={() => setCurrentIndex((i) => Math.min((shareData?.tracks.length ?? 1) - 1, i + 1))}
            disabled={currentIndex >= (shareData?.tracks.length ?? 1) - 1}
            className="text-[#a7a7a7] hover:text-white disabled:opacity-30 transition-colors"
          >
            <SkipForward size={24} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setVolume((v) => v === 0 ? 70 : 0)}
            className="text-[#a7a7a7] hover:text-white transition-colors flex-shrink-0"
          >
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <SliderBar
            value={volume}
            max={100}
            step={1}
            onChange={setVolume}
            className="flex-1"
          />
        </div>

        {/* Download button */}
        {shareData.downloadable && (
          <a
            href={`/share/d/${shareData.id}`}
            className="block text-center py-2.5 rounded-full border border-white/30 text-white text-sm font-semibold hover:border-white transition-colors mb-6"
          >
            <Download size={14} className="inline mr-2" />
            Download
          </a>
        )}

        {/* Track list */}
        {shareData.tracks.length > 1 && (
          <div className="bg-[#282828] rounded-xl overflow-hidden">
            {shareData.tracks.map((track, i) => (
              <button
                key={track.id}
                onClick={() => { setCurrentIndex(i); if (!isPlaying) setIsPlaying(true) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${i === currentIndex ? 'bg-white/10' : ''}`}
              >
                <span className={`text-xs w-4 text-right flex-shrink-0 ${i === currentIndex ? 'text-[#1db954]' : 'text-[#a7a7a7]'}`}>
                  {i === currentIndex && isPlaying ? '▶' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${i === currentIndex ? 'text-[#1db954]' : 'text-white'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-[#a7a7a7] truncate">{track.artist}</p>
                </div>
                <span className="text-xs text-[#a7a7a7] flex-shrink-0">{fmt(track.duration)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
