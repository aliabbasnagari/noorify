import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Heart, Clock, MoreHorizontal, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getCoverArtUrl, star, unstar, getStarred } from '@/lib/subsonic'
import type { SubsonicSong } from '@/lib/subsonic'
import { getSongsPage, nativeToSubsonic } from '@/lib/api'
import { usePlayer } from '@/contexts/PlayerContext'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { useTranslation } from '@/contexts/I18nContext'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PAGE_SIZE = 50

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

export default function SongsPage() {
  const { currentTrack, isPlaying, playQueue, togglePlay, playNext, addToQueue } = usePlayer()
  const { t } = useTranslation()
  const [scrollY, setScrollY] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [addMenuSongId, setAddMenuSongId] = useState<string | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)

  // ── Pagination state ──────────────────────────────────────────────────────
  const [songs, setSongs] = useState<SubsonicSong[]>([])
  const [total, setTotal] = useState(0)
  const [nextStart, setNextStart] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Guard against concurrent fetches
  const fetchingRef = useRef(false)

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const { data: starred } = useFetch(getStarred, [])
  const starredIds = new Set(starred?.song?.map((s) => s.id) ?? [])

  // ── Debounce search input ─────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  // ── Reset when search changes ─────────────────────────────────────────────
  useEffect(() => {
    setSongs([])
    setNextStart(0)
    setHasMore(true)
    setIsLoadingInitial(true)
    fetchingRef.current = false
  }, [debouncedSearch])

  // ── Page fetcher ──────────────────────────────────────────────────────────
  const fetchPage = useCallback(async (startIdx: number, query: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      const { data, total: t } = await getSongsPage({
        _start: startIdx,
        _end: startIdx + PAGE_SIZE,
        _sort: 'title',
        _order: 'ASC',
        ...(query ? { title: query } : {}),
      })

      const converted = data.map(nativeToSubsonic)
      setSongs((prev) => startIdx === 0 ? converted : [...prev, ...converted])
      setTotal(t)
      setHasMore(startIdx + PAGE_SIZE < t)
      setNextStart(startIdx + PAGE_SIZE)
    } finally {
      fetchingRef.current = false
      setIsLoadingInitial(false)
      setIsLoadingMore(false)
    }
  }, [])

  // ── Initial load (runs once after each reset) ─────────────────────────────
  useEffect(() => {
    if (!isLoadingInitial) return
    fetchPage(0, debouncedSearch)
  }, [isLoadingInitial, debouncedSearch, fetchPage])

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !fetchingRef.current && !isLoadingInitial) {
          setIsLoadingMore(true)
          fetchPage(nextStart, debouncedSearch)
        }
      },
      { rootMargin: '300px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, nextStart, debouncedSearch, fetchPage, isLoadingInitial])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleStar = async (songId: string) => {
    const isStarred = starredIds.has(songId) || likedSongs.has(songId)
    if (isStarred) {
      await unstar(songId)
      setLikedSongs((s) => { const n = new Set(s); n.delete(songId); return n })
    } else {
      await star(songId)
      setLikedSongs((s) => new Set(s).add(songId))
    }
  }

  const isThisListPlaying = songs.some((s) => s.id === currentTrack?.id) && isPlaying

  return (
    <>
    <div
      className="h-full overflow-y-auto"
      onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-b from-[#1a2a1a] via-[#121212]/70 to-[#121212]">
        <TopBar scrolled={scrollY > 60} bgColor="#1a2a1a" />
        <div className="px-4 sm:px-6 pb-6 pt-4">
          <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">{t('songs.browse')}</p>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-none">{t('songs.pageTitle')}</h1>
          <p className="text-sm text-[#a7a7a7]">
            {isLoadingInitial
              ? <Skeleton className="inline-block h-4 w-20 bg-[#282828]" />
              : t(total !== 1 ? 'songs.songCountPlural' : 'songs.songCount', { count: total.toLocaleString() }) + (debouncedSearch ? ` ${t('songs.matchingQuery', { query: debouncedSearch })}` : '')
            }
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={() => {
            if (songs.length === 0) return
            if (isThisListPlaying) togglePlay()
            else playQueue(songs, 0)
          }}
          disabled={isLoadingInitial || songs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform hover:bg-[#1ed760] shadow-xl disabled:opacity-40 flex-shrink-0"
        >
          {isThisListPlaying
            ? <Pause size={24} fill="black" className="text-black" />
            : <Play size={24} fill="black" className="text-black translate-x-0.5" />}
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a7a7a7] pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('songs.searchPlaceholder')}
            className="w-full bg-[#282828] border border-white/10 rounded-full pl-9 pr-8 py-2 text-sm text-white placeholder-[#a7a7a7] focus:outline-none focus:border-white/30 focus:bg-[#3e3e3e] transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a7a7a7] hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-2 text-xs uppercase tracking-widest text-[#a7a7a7] border-b border-white/10 mb-2">
          <span className="text-right">#</span>
          <span>{t('songs.titleColumn')}</span>
          <span className="hidden md:block">{t('songs.albumColumn')}</span>
          <span className="flex justify-end"><Clock size={14} /></span>
        </div>

        {/* Initial loading skeletons */}
        {isLoadingInitial && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-3 animate-pulse">
            <Skeleton className="h-4 bg-[#282828] rounded" />
            <Skeleton className="h-4 bg-[#282828] rounded" />
            <Skeleton className="h-4 bg-[#282828] rounded hidden md:block" />
            <Skeleton className="h-4 bg-[#282828] rounded" />
          </div>
        ))}

        {/* Empty state */}
        {!isLoadingInitial && songs.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <p className="text-[#a7a7a7] text-sm">
            {debouncedSearch ? t('songs.noSongsFound', { query: debouncedSearch }) : t('songs.emptyLibrary')}
            </p>
          </div>
        )}

        {/* Song rows */}
        {!isLoadingInitial && songs.map((song, idx) => {
          const isActive = song.id === currentTrack?.id
          const isStarred = starredIds.has(song.id) || likedSongs.has(song.id)
          const cover = getCoverArtUrl(song.coverArt, 40)

          return (
            <div
              key={song.id}
              className="group grid grid-cols-[16px_1fr_1fr_80px] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/5 transition-colors cursor-default"
              onMouseEnter={() => setHoveredId(song.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <button
                onClick={() => { if (isActive) togglePlay(); else playQueue(songs, idx) }}
                className="flex items-center justify-center"
              >
                {hoveredId === song.id ? (
                  isActive && isPlaying
                    ? <Pause size={12} fill="currentColor" className="text-white" />
                    : <Play size={12} fill="currentColor" className="text-white" />
                ) : (
                  <span className={cn('text-xs', isActive ? 'text-[#1db954]' : 'text-[#a7a7a7]')}>
                    {isActive && isPlaying ? '▶' : idx + 1}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded overflow-hidden bg-[#282828] flex-shrink-0">
                  {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium truncate', isActive ? 'text-[#1db954]' : 'text-white')}>
                    {song.title}
                  </p>
                  <Link
                    to={`/artist/${song.artistId}`}
                    className="text-xs text-[#a7a7a7] hover:underline truncate block"
                  >
                    {song.artist}
                  </Link>
                </div>
              </div>

              <Link
                to={`/album/${song.albumId}`}
                className="text-xs text-[#a7a7a7] hover:underline hidden md:block truncate"
              >
                {song.album}
              </Link>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => toggleStar(song.id)}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    isStarred && 'opacity-100',
                  )}
                >
                  <Heart
                    size={14}
                    fill={isStarred ? '#1db954' : 'none'}
                    className={isStarred ? 'text-[#1db954]' : 'text-[#a7a7a7]'}
                  />
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
                      {t('action.playNext')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addToQueue([song])} className="hover:bg-white/10 cursor-pointer">
                      {t('action.addToQueue')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        setAddMenuSongId(song.id)
                        setAddMenuAnchor(e.currentTarget as HTMLElement)
                      }}
                      className="hover:bg-white/10 cursor-pointer"
                    >
                      {t('action.addToPlaylist')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toggleStar(song.id)}
                      className="hover:bg-white/10 cursor-pointer"
                    >
                      {isStarred ? t('action.removeFromLiked') : t('action.addToLiked')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading more spinner */}
        {isLoadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* All loaded footer */}
        {!hasMore && songs.length > 0 && (
          <p className="text-center text-xs text-[#a7a7a7] py-6">
            {debouncedSearch
              ? t(songs.length !== 1 ? 'songs.resultsCountPlural' : 'songs.resultsCount', { count: songs.length.toLocaleString() })
              : t('songs.allLoaded', { count: total.toLocaleString() })}
          </p>
        )}
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
