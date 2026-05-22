import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, X, Loader2, Play } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useFetch } from '@/hooks/useFetch'
import {
  search,
  getGenres,
  getCoverArtUrl,
  type SearchResult,
} from '@/lib/subsonic'
import { usePlayer } from '@/contexts/PlayerContext'
import { Skeleton } from '@/components/ui/skeleton'

const GENRE_COLORS = [
  'bg-[#c13584]', 'bg-[#e17000]', 'bg-[#ba2c00]', 'bg-[#0d73ec]',
  'bg-[#8c1932]', 'bg-[#e8115b]', 'bg-[#56a0a0]', 'bg-[#ff4632]',
  'bg-[#477d95]', 'bg-[#e91429]', 'bg-[#fc3c44]', 'bg-[#2d46b9]',
  'bg-[#148a08]', 'bg-[#1e3264]', 'bg-[#8d67ab]', 'bg-[#e8115b]',
  'bg-[#509bf5]', 'bg-[#f59b23]',
]

function formatDuration(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [scrollY, setScrollY] = useState(0)

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data: genres, isLoading: loadingGenres } = useFetch(getGenres, [])
  const { data: results, isLoading: searching } = useFetch<SearchResult | null>(
    () => (debouncedQuery.trim() ? search(debouncedQuery, 3, 5, 10) : Promise.resolve(null)),
    [debouncedQuery],
  )

  const { playQueue, currentTrack } = usePlayer()

  const hasResults = debouncedQuery.trim().length > 0

  return (
    <div
      className="h-full overflow-y-auto"
      onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
    >
      <TopBar scrolled={scrollY > 60} />

      <div className="px-4 sm:px-6 pb-8">
        {/* Search input */}
        <div className="relative max-w-sm mb-6">
          {searching && debouncedQuery ? (
            <Loader2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-black animate-spin pointer-events-none" />
          ) : (
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
          )}
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 bg-white text-black rounded-full pl-10 pr-10 text-sm font-medium placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search results */}
        {hasResults && results && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Top result */}
              {results.song[0] && (
                <div
                  className="bg-[#181818] hover:bg-[#282828] rounded-lg p-5 cursor-pointer group transition-colors relative"
                  onClick={() => playQueue(results.song, 0)}
                >
                  <div className="w-20 h-20 rounded-md overflow-hidden mb-4 bg-[#282828]">
                    {results.song[0].coverArt ? (
                      <img
                        src={getCoverArtUrl(results.song[0].coverArt, 80)}
                        alt={results.song[0].title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">♫</div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{results.song[0].title}</p>
                  <p className="text-sm text-[#a7a7a7]">
                    <span className="text-white font-medium">Song</span> · {results.song[0].artist}
                  </p>
                  <button className="absolute bottom-5 right-5 w-12 h-12 bg-[#1db954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 shadow-xl">
                    <Play size={20} fill="black" className="text-black translate-x-0.5" />
                  </button>
                </div>
              )}

              {/* Songs */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3">Songs</h3>
                <div className="space-y-2">
                  {results.song.slice(0, 4).map((track, idx) => {
                    const isActive = currentTrack?.id === track.id
                    return (
                      <div
                        key={track.id}
                        onClick={() => isActive ? undefined : playQueue(results.song, idx)}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-[#282828] cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded bg-[#282828] flex-shrink-0 overflow-hidden relative">
                          {track.coverArt ? (
                            <img src={getCoverArtUrl(track.coverArt, 40)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">♫</div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={14} fill="white" className="text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-[#1db954]' : 'text-white'}`}>{track.title}</p>
                          <p className="text-xs text-[#a7a7a7] truncate">{track.artist}</p>
                        </div>
                        <span className="text-xs text-[#a7a7a7]">{formatDuration(track.duration)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Albums */}
            {results.album.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3">Albums</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {results.album.map((album) => (
                    <Link
                      key={album.id}
                      to={`/album/${album.id}`}
                      className="group bg-[#181818] hover:bg-[#282828] rounded-md p-3 transition-colors"
                    >
                      <div className="aspect-square rounded-md overflow-hidden bg-[#282828] mb-2">
                        {album.coverArt ? (
                          <img src={getCoverArtUrl(album.coverArt, 200)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">♫</div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{album.name}</p>
                      <p className="text-xs text-[#a7a7a7] truncate">{album.artist}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Artists */}
            {results.artist.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3">Artists</h3>
                <div className="flex gap-4">
                  {results.artist.map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/artist/${artist.id}`}
                      className="group bg-[#181818] hover:bg-[#282828] rounded-md p-4 text-center w-36 transition-colors flex-shrink-0"
                    >
                      <div className="w-24 h-24 rounded-full mx-auto mb-2 bg-[#282828] overflow-hidden">
                        {artist.artistImageUrl ? (
                          <img src={artist.artistImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                      <p className="text-xs text-[#a7a7a7]">Artist</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.song.length === 0 && results.album.length === 0 && results.artist.length === 0 && (
              <p className="text-[#a7a7a7] text-center py-8">No results for "{debouncedQuery}"</p>
            )}
          </div>
        )}

        {/* Genres */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">
            {hasResults ? 'Browse categories' : 'Browse all'}
          </h2>
          {loadingGenres ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {(genres ?? []).map((genre, i) => (
                <Link
                  key={genre.value}
                  to={`/genre/${encodeURIComponent(genre.value)}`}
                  className={`${GENRE_COLORS[i % GENRE_COLORS.length]} rounded-lg p-4 h-32 relative overflow-hidden cursor-pointer hover:brightness-110 transition-all`}
                >
                  <span className="text-white font-bold text-base leading-tight">{genre.value}</span>
                  <div className="absolute bottom-0 right-0 w-16 h-16 rotate-[25deg] translate-x-2 translate-y-2 rounded-md bg-black/20 flex items-center justify-center text-2xl">
                    ♫
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
