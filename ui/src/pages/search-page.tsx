import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Play } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { AlbumCard } from '@/components/library/album-card'
import { ArtistCard } from '@/components/library/artist-card'
import { PlaylistRow } from '@/components/library/playlist-row'
import { SongRow } from '@/components/library/song-row'
import { getCoverArtUrl } from '@/lib/api/subsonic'
import type { Album, Artist, Playlist, Song } from '@/lib/api/types'
import { useGlobalSearch, type SearchCounts } from '@/hooks/use-global-search'
import { playAlbum, playArtist, playPlaylist } from '@/lib/player/play-actions'
import {
  songToQueuedTrack,
  useCurrentTrack,
  usePlayerStore,
} from '@/stores/player-store'
import {
  SEARCH_CATEGORIES,
  searchRoute,
  type SearchCategory,
} from '@/routes/search'

const ALL_COUNTS: SearchCounts = {
  artistCount: 6,
  albumCount: 6,
  songCount: 8,
  playlistCount: 6,
}

const ZERO_COUNTS: SearchCounts = {
  artistCount: 0,
  albumCount: 0,
  songCount: 0,
  playlistCount: 0,
}

const PAGE_SIZE = 24

export default function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = searchRoute.useSearch()
  const query = search.q.trim()
  const category = search.category

  function setCategory(next: SearchCategory) {
    void navigate({
      to: '/search',
      search: { q: query, category: next },
      replace: true,
    })
  }

  if (!query) {
    return (
      <div className="py-6">
        <p className="py-12 text-center text-muted-foreground">
          {t('search.prompt')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-6">
      <CategoryChips category={category} onChange={setCategory} />
      {category === 'all' ? (
        <AllResults query={query} onCategoryChange={setCategory} />
      ) : (
        <CategoryResults query={query} category={category} />
      )}
    </div>
  )
}

function CategoryChips({
  category,
  onChange,
}: {
  category: SearchCategory
  onChange: (category: SearchCategory) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {SEARCH_CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-pressed={category === c}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            category === c
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          {t(`search.category.${c}`)}
        </button>
      ))}
    </div>
  )
}

function NoResults({ query }: { query: string }) {
  const { t } = useTranslation()
  return (
    <div className="py-12 text-center text-muted-foreground">
      <p>{t('search.noResults', { query })}</p>
      <p className="mt-1 text-sm">{t('search.noResultsHint')}</p>
    </div>
  )
}

type TopResult =
  | { kind: 'artist'; artist: Artist }
  | { kind: 'album'; album: Album }
  | { kind: 'playlist'; playlist: Playlist }
  | { kind: 'song'; song: Song }

function AllResults({
  query,
  onCategoryChange,
}: {
  query: string
  onCategoryChange: (category: SearchCategory) => void
}) {
  const { t } = useTranslation()
  const { data, isLoading, isFetching } = useGlobalSearch(query, ALL_COUNTS)
  const currentTrack = useCurrentTrack()
  const setQueue = usePlayerStore((s) => s.setQueue)

  // Favors an artist match the way Spotify's "top result" usually does,
  // falling back down the entity hierarchy when there isn't one.
  const topResult = useMemo<TopResult | null>(() => {
    if (!data) return null
    if (data.artists[0]) return { kind: 'artist', artist: data.artists[0] }
    if (data.albums[0]) return { kind: 'album', album: data.albums[0] }
    if (data.playlists[0])
      return { kind: 'playlist', playlist: data.playlists[0] }
    if (data.songs[0]) return { kind: 'song', song: data.songs[0] }
    return null
  }, [data])

  if (isLoading) {
    return <p className="text-muted-foreground">{t('search.searching')}</p>
  }

  const hasResults =
    !!data &&
    (data.artists.length > 0 ||
      data.albums.length > 0 ||
      data.songs.length > 0 ||
      data.playlists.length > 0)

  if (!data || !hasResults) {
    return <NoResults query={query} />
  }

  const topSongs = data.songs.slice(0, 4)

  return (
    <div className={cn('space-y-8', isFetching && 'opacity-60')}>
      {(topResult || topSongs.length > 0) && (
        <section className="grid gap-6 lg:grid-cols-2">
          {topResult && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{t('search.topResult')}</h2>
              <TopResultCard result={topResult} />
            </div>
          )}
          {topSongs.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{t('search.songs')}</h2>
              <div>
                {topSongs.map((song, index) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index}
                    showAlbum
                    active={currentTrack?.id === song.id}
                    onPlay={() =>
                      setQueue(topSongs.map(songToQueuedTrack), index)
                    }
                    onPlayNext={() =>
                      usePlayerStore
                        .getState()
                        .playNextInQueue(songToQueuedTrack(song))
                    }
                    onAddToQueue={() =>
                      usePlayerStore
                        .getState()
                        .addToQueue(songToQueuedTrack(song))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {data.artists.length > 0 && (
        <ResultSection
          title={t('search.artists')}
          onShowAll={() => onCategoryChange('artists')}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {data.artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </ResultSection>
      )}

      {data.albums.length > 0 && (
        <ResultSection
          title={t('search.albums')}
          onShowAll={() => onCategoryChange('albums')}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {data.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </ResultSection>
      )}

      {data.playlists.length > 0 && (
        <ResultSection
          title={t('search.playlists')}
          onShowAll={() => onCategoryChange('playlists')}
        >
          <div>
            {data.playlists.map((playlist) => (
              <PlaylistRow key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  )
}

function ResultSection({
  title,
  onShowAll,
  children,
}: {
  title: string
  onShowAll: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={onShowAll}>
          {t('home.showAll')}
        </Button>
      </div>
      {children}
    </section>
  )
}

function topResultTitle(result: TopResult): string {
  switch (result.kind) {
    case 'artist':
      return result.artist.name
    case 'album':
      return result.album.name
    case 'playlist':
      return result.playlist.name
    case 'song':
      return result.song.title
  }
}

function topResultCoverUrl(result: TopResult): string {
  switch (result.kind) {
    case 'artist':
      return getCoverArtUrl(result.artist.id, 'ar', 300)
    case 'album':
      return getCoverArtUrl(result.album.id, 'al', 300)
    case 'playlist':
      return getCoverArtUrl(result.playlist.id, 'pl', 300)
    case 'song':
      return getCoverArtUrl(result.song.albumId, 'al', 300)
  }
}

function TopResultCard({ result }: { result: TopResult }) {
  const { t } = useTranslation()
  const title = topResultTitle(result)

  function handlePlay(event: MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    if (result.kind === 'artist') void playArtist(result.artist.id)
    else if (result.kind === 'album') void playAlbum(result.album.id)
    else if (result.kind === 'playlist') void playPlaylist(result.playlist.id)
    else usePlayerStore.getState().setQueue([songToQueuedTrack(result.song)], 0)
  }

  const card = (
    <div className="group relative flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent">
      <div
        className={cn(
          'relative size-20 shrink-0 overflow-hidden bg-muted',
          result.kind === 'artist' ? 'rounded-full' : 'rounded-md',
        )}
      >
        <img
          src={topResultCoverUrl(result)}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`search.resultType.${result.kind}`)}
        </p>
      </div>
      <Button
        size="icon-lg"
        className="absolute right-5 bottom-5 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        aria-label={t('search.playAria', { name: title })}
        onClick={handlePlay}
      >
        <Play className="fill-current" />
      </Button>
    </div>
  )

  if (result.kind === 'artist') {
    return (
      <Link to="/artist/$artistId" params={{ artistId: result.artist.id }}>
        {card}
      </Link>
    )
  }
  if (result.kind === 'album') {
    return (
      <Link to="/album/$albumId" params={{ albumId: result.album.id }}>
        {card}
      </Link>
    )
  }
  if (result.kind === 'playlist') {
    return (
      <Link
        to="/playlist/$playlistId"
        params={{ playlistId: result.playlist.id }}
      >
        {card}
      </Link>
    )
  }
  return (
    <button
      type="button"
      className="block w-full text-left"
      onClick={handlePlay}
    >
      {card}
    </button>
  )
}

function CategoryResults({
  query,
  category,
}: {
  query: string
  category: Exclude<SearchCategory, 'all'>
}) {
  const { t } = useTranslation()
  const currentTrack = useCurrentTrack()
  const setQueue = usePlayerStore((s) => s.setQueue)
  const [limit, setLimit] = useState(PAGE_SIZE)

  // A new query or a switch to a different category tab starts back at the
  // first page rather than keeping whatever "load more" depth was reached
  // for the previous one. Reset during render (not an effect) so the first
  // render for the new query/category already uses PAGE_SIZE.
  const [lastKey, setLastKey] = useState(`${query}:${category}`)
  const key = `${query}:${category}`
  if (key !== lastKey) {
    setLastKey(key)
    setLimit(PAGE_SIZE)
  }

  const counts = useMemo<SearchCounts>(() => {
    switch (category) {
      case 'songs':
        return { ...ZERO_COUNTS, songCount: limit }
      case 'artists':
        return { ...ZERO_COUNTS, artistCount: limit }
      case 'albums':
        return { ...ZERO_COUNTS, albumCount: limit }
      case 'playlists':
        return { ...ZERO_COUNTS, playlistCount: limit }
    }
  }, [category, limit])

  const { data, isLoading, isFetching } = useGlobalSearch(query, counts)

  if (isLoading) {
    return <p className="text-muted-foreground">{t('search.searching')}</p>
  }
  if (!data) return null

  const items: unknown[] =
    category === 'songs'
      ? data.songs
      : category === 'artists'
        ? data.artists
        : category === 'albums'
          ? data.albums
          : data.playlists

  if (items.length === 0) {
    return <NoResults query={query} />
  }

  // search3's offset-based pagination has no total count — a page that
  // came back full just means there may be more to load, not that there
  // definitely is.
  const hasMore = items.length >= limit

  return (
    <div className={cn('space-y-4', isFetching && 'opacity-60')}>
      {category === 'songs' && (
        <div>
          {data.songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index}
              showAlbum
              active={currentTrack?.id === song.id}
              onPlay={() => setQueue(data.songs.map(songToQueuedTrack), index)}
              onPlayNext={() =>
                usePlayerStore
                  .getState()
                  .playNextInQueue(songToQueuedTrack(song))
              }
              onAddToQueue={() =>
                usePlayerStore.getState().addToQueue(songToQueuedTrack(song))
              }
            />
          ))}
        </div>
      )}
      {category === 'artists' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {data.artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
      {category === 'albums' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {data.albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
      {category === 'playlists' && (
        <div>
          {data.playlists.map((playlist) => (
            <PlaylistRow key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
          >
            {t('search.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
