import { useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, Pause, UserCheck, MoreHorizontal, Clock, Heart, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import { getArtist, getArtistInfo, getCoverArtUrl, getStarred, star, unstar } from '@/lib/subsonic'
import { getArtistSongs, nativeToSubsonic, uploadArtistImage } from '@/lib/api'
import { usePlayer } from '@/contexts/PlayerContext'
import { useAuth } from '@/contexts/AuthContext'
import { ArtistExternalLinks } from '@/components/ExternalLinks'
import { AddToPlaylistMenu } from '@/components/playlist/AddToPlaylistMenu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/contexts/ToastContext'

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const { currentTrack, isPlaying, playQueue, togglePlay } = usePlayer()
  const { user } = useAuth()
  const toast = useToast()
  const [isFollowing, setIsFollowing] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [showAllSongs, setShowAllSongs] = useState(false)
  const [addMenuSongId, setAddMenuSongId] = useState<string | null>(null)
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const { data: artist, isLoading, refetch: refetchArtist } = useFetch(() => getArtist(id!), [id])
  const { data: info } = useFetch(() => getArtistInfo(id!), [id])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await uploadArtistImage(id!, file)
      toast.success('Cover image updated')
      refetchArtist()
    } catch {
      toast.error('Failed to upload image')
    }
  }
  const { data: nativeSongs, isLoading: songsLoading } = useFetch(() => getArtistSongs(id!), [id])
  const { data: starred } = useFetch(getStarred, [])

  const albums = artist?.album ?? []
  const starredIds = new Set(starred?.song?.map((s) => s.id) ?? [])
  // Prefer the local Navidrome cover (uploaded image takes highest priority on the backend).
  // Fall back to external Last.fm images only when no local cover exists.
  const localCover = artist?.coverArt ? getCoverArtUrl(artist?.coverArt, 600) : null
  const heroImage = localCover || info?.largeImageUrl || info?.mediumImageUrl || null
  const similarArtists = info?.similarArtist ?? []

  // Convert native tracks to SubsonicSong for the player
  const songs = (nativeSongs ?? []).map(nativeToSubsonic)
  const visibleSongs = showAllSongs ? songs : songs.slice(0, 5)

  const isArtistPlaying = songs.some((t) => t.id === currentTrack?.id) && isPlaying

  const toggleStar = (songId: string) => {
    const isStarred = starredIds.has(songId) || likedSongs.has(songId)
    if (isStarred) {
      unstar(songId)
      setLikedSongs((s) => { const n = new Set(s); n.delete(songId); return n })
    } else {
      star(songId)
      setLikedSongs((s) => new Set(s).add(songId))
    }
  }

  return (
    <>
    <div className="h-full overflow-y-auto" onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}>
      {/* Hero */}
      <div className="relative h-[260px] sm:h-[340px] overflow-hidden flex-shrink-0">
        {heroImage ? (
          <img src={heroImage} alt={artist?.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0533] to-[#121212]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-[#121212]" />
        <TopBar scrolled={scrollY > 280} bgColor="#1a0533" />
        <div className="absolute bottom-6 left-6">
          {!isLoading && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#1db954] rounded-full" />
                <span className="text-sm text-white font-medium">Artist</span>
              </div>
              <h1 className="text-4xl sm:text-7xl font-black text-white leading-none">{artist?.name}</h1>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 sm:px-6 py-4 flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => {
            if (songs.length === 0) return
            if (isArtistPlaying) togglePlay()
            else playQueue(songs, 0)
          }}
          className="w-14 h-14 rounded-full bg-[#1db954] flex items-center justify-center hover:scale-105 transition-transform hover:bg-[#1ed760] shadow-xl disabled:opacity-40"
          disabled={songs.length === 0 && !songsLoading}
        >
          {isArtistPlaying
            ? <Pause size={24} fill="black" className="text-black" />
            : <Play size={24} fill="black" className="text-black translate-x-0.5" />}
        </button>
        <button
          onClick={() => setIsFollowing((f) => !f)}
          className={cn('px-4 py-1.5 rounded-full border text-sm font-semibold transition-colors',
            isFollowing ? 'border-white/50 text-white hover:border-white' : 'border-[#a7a7a7] text-[#a7a7a7] hover:text-white hover:border-white')}
        >
          {isFollowing ? <span className="flex items-center gap-1"><UserCheck size={14} /> Following</span> : 'Follow'}
        </button>
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
              <DropdownMenuItem
                className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                onClick={() => imgInputRef.current?.click()}
              >
                <ImagePlus size={14} className="mr-2" /> Upload image
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bio + external links */}
      {(info?.biography || info?.lastFmUrl || info?.musicBrainzId) && (
        <div className="px-4 sm:px-6 mb-6">
          {info?.biography && (
            <p className="text-[#a7a7a7] text-sm leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: info.biography }} />
          )}
          <ArtistExternalLinks
            artistName={artist?.name}
            lastFmUrl={info?.lastFmUrl}
            musicBrainzId={info?.musicBrainzId}
          />
        </div>
      )}

      <div className="px-4 sm:px-6 pb-8 space-y-8">
        {/* ── All Songs ── */}
        <section>
          <h2 className="text-xl font-bold text-white mb-2">Songs</h2>

          {/* header row */}
          <div className="grid grid-cols-[16px_1fr_80px] md:grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-2 text-xs uppercase tracking-widest text-[#a7a7a7] border-b border-white/10 mb-1">
            <span className="text-right">#</span>
            <span>Title</span>
            <span className="hidden md:block">Album</span>
            <span className="flex justify-end"><Clock size={14} /></span>
          </div>

          {songsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[16px_1fr_80px] md:grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-3">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4 hidden md:block" />
                  <Skeleton className="h-4" />
                </div>
              ))
            : visibleSongs.map((track, idx) => {
                const isActive = currentTrack?.id === track.id
                const isHovered = hoveredId === track.id
                const isFav = starredIds.has(track.id) || likedSongs.has(track.id)
                const cover = track.coverArt ? getCoverArtUrl(track.coverArt, 40) : ''
                return (
                  <div
                    key={track.id}
                    className={cn('grid grid-cols-[16px_1fr_80px] md:grid-cols-[16px_1fr_1fr_80px] gap-4 px-4 py-2 rounded-md group cursor-pointer', isActive ? 'bg-white/10' : 'hover:bg-white/5')}
                    onMouseEnter={() => setHoveredId(track.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onDoubleClick={() => playQueue(songs, idx)}
                  >
                    {/* # / play indicator */}
                    <div className="flex items-center justify-end">
                      {isHovered ? (
                        <button
                          onClick={() => isActive ? togglePlay() : playQueue(songs, idx)}
                          className="text-white"
                        >
                          {isActive && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </button>
                      ) : isActive ? (
                        <span className="text-[#1db954] text-xs">{isPlaying ? '♫' : '▐▐'}</span>
                      ) : (
                        <span className="text-sm text-[#a7a7a7]">{idx + 1}</span>
                      )}
                    </div>

                    {/* title + cover */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-[#282828] rounded flex-shrink-0 overflow-hidden">
                        {cover
                          ? <img src={cover} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-sm">♫</div>}
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium truncate', isActive ? 'text-[#1db954]' : 'text-white')}>{track.title}</p>
                        <p className="text-xs text-[#a7a7a7] truncate">{track.artist}</p>
                      </div>
                    </div>

                    {/* album */}
                    <div className="hidden md:flex items-center min-w-0">
                      <Link
                        to={`/album/${track.albumId}`}
                        className="text-sm text-[#a7a7a7] truncate hover:text-white hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {track.album}
                      </Link>
                    </div>

                    {/* heart + duration + more */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(track.id) }}
                        className={cn('opacity-0 group-hover:opacity-100 transition-opacity', isFav ? 'text-[#1db954] opacity-100' : 'text-[#a7a7a7] hover:text-white')}
                      >
                        <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
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

          {/* show more / less toggle */}
          {songs.length > 5 && (
            <button
              onClick={() => setShowAllSongs((v) => !v)}
              className="mt-2 px-4 text-sm font-bold text-[#a7a7a7] hover:text-white transition-colors"
            >
              {showAllSongs ? 'Show less' : `See all ${songs.length} songs`}
            </button>
          )}
        </section>

        {/* Albums */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Discography</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card rounded-md p-4 space-y-3">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {albums.map((album) => {
                const cover = getCoverArtUrl(album.coverArt, 300)
                return (
                  <Link key={album.id} to={`/album/${album.id}`} className="group bg-[#181818] hover:bg-[#282828] rounded-md p-4 transition-colors cursor-pointer">
                    <div className="relative mb-3">
                      <div className="aspect-square rounded-md overflow-hidden bg-[#282828]">
                        {cover ? (
                          <img src={cover} alt={album.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">♫</div>
                        )}
                      </div>
                      <button className="absolute bottom-2 right-2 w-10 h-10 bg-[#1db954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-lg">
                        <Play size={18} fill="black" className="text-black translate-x-0.5" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{album.name}</p>
                    <p className="text-xs text-[#a7a7a7] mt-1">{album.year} · Album</p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Similar artists */}
        {similarArtists.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Fans also like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similarArtists.map((a) => (
                <Link key={a.id} to={`/artist/${a.id}`} className="group bg-[#181818] hover:bg-[#282828] rounded-md p-4 transition-colors cursor-pointer">
                  <div className="relative mb-3">
                    <div className="aspect-square rounded-full overflow-hidden bg-[#282828]">
                      {a.artistImageUrl ? (
                        <img src={a.artistImageUrl} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                      )}
                    </div>
                    <button className="absolute bottom-2 right-2 w-10 h-10 bg-[#1db954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-lg">
                      <Play size={18} fill="black" className="text-black translate-x-0.5" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-white text-center truncate">{a.name}</p>
                  <p className="text-xs text-[#a7a7a7] text-center mt-1">Artist</p>
                </Link>
              ))}
            </div>
          </section>
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

