import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { scrobble, star, unstar, getStarred, savePlayQueue, getPlayQueue, setRating } from '@/lib/subsonic'
import type { SubsonicSong } from '@/lib/subsonic'
import { transcodeService } from '@/lib/transcodeService'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReplayGainMode = 'none' | 'track' | 'album'

interface PlayerContextValue {
  currentTrack: SubsonicSong | null
  queue: SubsonicSong[]
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  shuffleActive: boolean
  repeatMode: 'off' | 'all' | 'one'
  isCurrentStarred: boolean
  replayGainMode: ReplayGainMode
  replayGainPreamp: number
  currentRating: number
  /** Replace queue and start playing at index (default 0). */
  playQueue: (songs: SubsonicSong[], index?: number) => void
  /** Play a single song (replaces queue). */
  playTrack: (song: SubsonicSong) => void
  /** Insert songs immediately after the current track. */
  playNext: (songs: SubsonicSong[]) => void
  /** Append songs to the end of the queue. */
  addToQueue: (songs: SubsonicSong[]) => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  next: () => void
  prev: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  toggleStarCurrent: () => Promise<void>
  setReplayGainMode: (mode: ReplayGainMode) => void
  setReplayGainPreamp: (db: number) => void
  rateCurrentTrack: (rating: number) => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextValue | null>(null)

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const [queue, setQueue] = useState<SubsonicSong[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  // Incremented each time playQueue/playTrack is called — forces Effect 1 to
  // reload the audio even when the same song is selected again.
  const [playKey, setPlayKey] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('nd:volume') ?? 70))
  const [isMuted, setIsMuted] = useState(false)
  const [shuffleActive, setShuffleActive] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())
  const [replayGainMode, setReplayGainModeState] = useState<ReplayGainMode>(
    () => (localStorage.getItem('nd:replayGainMode') as ReplayGainMode) ?? 'none',
  )
  const [replayGainPreamp, setReplayGainPreampState] = useState<number>(
    () => Number(localStorage.getItem('nd:replayGainPreamp') ?? 0),
  )
  const [currentRating, setCurrentRating] = useState(0)

  const currentTrack = queue[currentIndex] ?? null
  const isCurrentStarred = currentTrack ? starredIds.has(currentTrack.id) : false

  // Initialise browser codec profile once on mount so the transcode service
  // is ready before the first song loads.
  useEffect(() => {
    transcodeService.init()
  }, [])

  // Load starred IDs once on mount
  useEffect(() => {
    getStarred().then((res) => {
      const ids = new Set(res.song?.map((s) => s.id) ?? [])
      setStarredIds(ids)
    }).catch(() => {})
  }, [])

  // Restore queue from server on mount
  useEffect(() => {
    getPlayQueue().then((pq) => {
      if (!pq || !pq.entry?.length) return
      setQueue(pq.entry)
      const idx = pq.entry.findIndex((s) => s.id === pq.current)
      setCurrentIndex(idx >= 0 ? idx : 0)
      // Don't auto-play on restore
    }).catch(() => {})
  }, [])

  // Save queue to server whenever it changes (debounced)
  const saveQueueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!queue.length) return
    if (saveQueueTimerRef.current) clearTimeout(saveQueueTimerRef.current)
    saveQueueTimerRef.current = setTimeout(() => {
      const current = queue[currentIndex]?.id
      savePlayQueue(queue.map((s) => s.id), current, Math.floor(currentTime * 1000)).catch(() => {})
    }, 5000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex])

  // ── ReplayGain: set up AudioContext + GainNode when mode changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || replayGainMode === 'none') {
      if (gainNodeRef.current) gainNodeRef.current.gain.value = 1
      return
    }
    if (!audioCtxRef.current) {
      try {
        const ctx = new AudioContext()
        const src = ctx.createMediaElementSource(audio)
        const gainNode = ctx.createGain()
        src.connect(gainNode)
        gainNode.connect(ctx.destination)
        audioCtxRef.current = ctx
        gainNodeRef.current = gainNode
      } catch {
        return
      }
    }
    // Apply preamp + track/album gain from the current track
    const track = queue[currentIndex]
    const trackGain = (track as any)?.replayGain?.trackGain ?? 0
    const albumGain = (track as any)?.replayGain?.albumGain ?? trackGain
    const gain = replayGainMode === 'album' ? albumGain : trackGain
    const linearGain = Math.pow(10, (gain + replayGainPreamp) / 20)
    if (gainNodeRef.current) gainNodeRef.current.gain.value = linearGain
  }, [replayGainMode, replayGainPreamp, currentIndex, queue])

  // ── Effect 1: Load and start the audio whenever the track or playKey changes.
  // Intentionally excludes `isPlaying` so that toggling play/pause doesn't
  // reload the src. Effect 2 handles that case.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const isRadio = !!(currentTrack as any).isRadio
    let cancelled = false
    let scrobbleTimer: ReturnType<typeof setTimeout> | null = null

    async function loadTrack() {
      audio!.pause()

      // Radio stations stream directly; regular songs go through the transcode
      // decision service so the server can choose direct-play vs. transcode.
      let src: string
      if (isRadio) {
        src = (currentTrack as any).streamUrl
      } else {
        src = await transcodeService.resolveStreamUrl(currentTrack!.id)
      }

      if (cancelled) return

      audio!.src = src
      audio!.currentTime = 0
      audio!.load()

      if (isPlaying) {
        audio!.play().catch(() => setIsPlaying(false))
        if (!isRadio) {
          scrobbleTimer = setTimeout(() => {
            scrobble(currentTrack!.id).catch(() => {})
          }, 4000)
        }
      }

      // Pre-fetch transcode decisions for the next 3 tracks.
      if (!isRadio) {
        const upcoming = queue
          .slice(currentIndex + 1, currentIndex + 4)
          .filter((s) => !(s as any).isRadio)
          .map((s) => s.id)
        transcodeService.prefetch(upcoming)
      }
    }

    loadTrack()

    return () => {
      cancelled = true
      if (scrobbleTimer) clearTimeout(scrobbleTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, playKey])

  // ── Effect 2: Sync play/pause state without reloading the track.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  // ── Effect 3: Sync volume/mute.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = isMuted ? 0 : volume / 100
  }, [volume, isMuted])

  // ── Actions ────────────────────────────────────────────────────────────────

  const playQueue = useCallback((songs: SubsonicSong[], index = 0) => {
    setPlayKey((k) => k + 1)
    setQueue(songs)
    setCurrentIndex(index)
    setCurrentTime(0)
    setDuration(0)
    setCurrentRating((songs[index] as any)?.userRating ?? 0)
    setIsPlaying(true)
  }, [])

  const playTrack = useCallback((song: SubsonicSong) => {
    setPlayKey((k) => k + 1)
    setQueue([song])
    setCurrentIndex(0)
    setCurrentTime(0)
    setDuration(0)
    setCurrentRating((song as any)?.userRating ?? 0)
    setIsPlaying(true)
  }, [])

  const playNext = useCallback((songs: SubsonicSong[]) => {
    setQueue((q) => {
      if (!q.length) return songs
      const insertAt = currentIndex + 1
      return [...q.slice(0, insertAt), ...songs, ...q.slice(insertAt)]
    })
  }, [currentIndex])

  const addToQueue = useCallback((songs: SubsonicSong[]) => {
    setQueue((q) => [...q, ...songs])
  }, [])

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), [])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
  }, [])

  const handleSetVolume = useCallback((v: number) => {
    setVolume(v)
    localStorage.setItem('nd:volume', String(v))
    setIsMuted(false)
  }, [])

  const setReplayGainMode = useCallback((mode: ReplayGainMode) => {
    setReplayGainModeState(mode)
    localStorage.setItem('nd:replayGainMode', mode)
  }, [])

  const setReplayGainPreamp = useCallback((db: number) => {
    setReplayGainPreampState(db)
    localStorage.setItem('nd:replayGainPreamp', String(db))
  }, [])

  const rateCurrentTrack = useCallback(async (rating: number) => {
    if (!currentTrack) return
    await setRating(currentTrack.id, rating)
    setCurrentRating(rating)
  }, [currentTrack])

  const toggleMute = useCallback(() => setIsMuted((m) => !m), [])
  const toggleShuffle = useCallback(() => setShuffleActive((s) => !s), [])
  const cycleRepeat = useCallback(
    () => setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off')),
    [],
  )

  const toggleStarCurrent = useCallback(async () => {
    if (!currentTrack) return
    const id = currentTrack.id
    if (starredIds.has(id)) {
      await unstar(id)
      setStarredIds((s) => { const n = new Set(s); n.delete(id); return n })
    } else {
      await star(id)
      setStarredIds((s) => new Set(s).add(id))
    }
  }, [currentTrack, starredIds])

  const next = useCallback(() => {
    setCurrentIndex((i) => {
      const len = queue.length
      if (!len) return i
      let next = i
      if (shuffleActive) {
        const r = Math.floor(Math.random() * len)
        next = r === i ? (r + 1) % len : r
      } else if (i + 1 >= len) {
        if (repeatMode === 'all') next = 0
        else { setIsPlaying(false); return i }
      } else {
        next = i + 1
      }
      setCurrentRating((queue[next] as any)?.userRating ?? 0)
      return next
    })
  }, [queue, shuffleActive, repeatMode])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      setCurrentTime(0)
      return
    }
    setCurrentIndex((i) => {
      const next = i > 0 ? i - 1 : i
      setCurrentRating((queue[next] as any)?.userRating ?? 0)
      return next
    })
  }, [queue])

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
      return
    }
    next()
  }, [repeatMode, next])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          if (e.altKey) { e.preventDefault(); next() }
          break
        case 'ArrowLeft':
          if (e.altKey) { e.preventDefault(); prev() }
          break
        case 'KeyM':
          toggleMute()
          break
        case 'KeyS':
          if (e.altKey) { e.preventDefault(); toggleShuffle() }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, next, prev, toggleMute, toggleShuffle])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        currentIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        shuffleActive,
        repeatMode,
        isCurrentStarred,
        replayGainMode,
        replayGainPreamp,
        currentRating,
        playQueue,
        playTrack,
        playNext,
        addToQueue,
        togglePlay,
        seek,
        setVolume: handleSetVolume,
        toggleMute,
        next,
        prev,
        toggleShuffle,
        cycleRepeat,
        toggleStarCurrent,
        setReplayGainMode,
        setReplayGainPreamp,
        rateCurrentTrack,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={handleEnded}
      />
    </PlayerContext.Provider>
  )
}
