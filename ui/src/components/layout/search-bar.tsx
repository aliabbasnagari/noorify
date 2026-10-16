import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ListMusic, Play, Plus, Search as SearchIcon, X } from 'lucide-react'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getCoverArtUrl } from '@/lib/api/subsonic'
import type { Album, Artist, Playlist, Song } from '@/lib/api/types'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useGlobalSearch } from '@/hooks/use-global-search'
import { playAlbum, playArtist, playPlaylist } from '@/lib/player/play-actions'
import { songToQueuedTrack, usePlayerStore } from '@/stores/player-store'

type SuggestionItem =
  | { kind: 'query'; key: string; text: string }
  | { kind: 'artist'; key: string; artist: Artist }
  | { kind: 'song'; key: string; song: Song }
  | { kind: 'album'; key: string; album: Album }
  | { kind: 'playlist'; key: string; playlist: Playlist }

const SUGGESTION_COUNTS = {
  artistCount: 3,
  albumCount: 3,
  songCount: 5,
  playlistCount: 3,
}

export function SearchBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  // This bar lives in the persistent topbar (mounted once for the whole
  // session, not remounted per route), so its own `query` state doesn't
  // naturally pick up a `q` that arrived some other way — a reload of
  // `/search?q=…`, a bookmarked link, or browser back/forward. Seed it from
  // (and then keep mirroring) the results page's own search param, so the
  // box never shows empty while results for a real query are on screen.
  // Plain typing doesn't touch the URL (only Enter/category clicks do), so
  // this never fights live keystrokes.
  const routeQuery = useRouterState({
    select: (s) =>
      s.location.pathname === '/search'
        ? ((s.location.search as { q?: string }).q ?? '')
        : null,
  })
  const [query, setQuery] = useState(routeQuery ?? '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debouncedQuery = useDebouncedValue(query.trim(), 250)

  const [lastRouteQuery, setLastRouteQuery] = useState(routeQuery)
  if (routeQuery !== null && routeQuery !== lastRouteQuery) {
    setLastRouteQuery(routeQuery)
    setQuery(routeQuery)
  }

  const { data, isFetching } = useGlobalSearch(
    debouncedQuery,
    SUGGESTION_COUNTS,
  )

  const items = useMemo<SuggestionItem[]>(() => {
    if (!debouncedQuery) return []
    const list: SuggestionItem[] = [
      { kind: 'query', key: 'query', text: debouncedQuery },
    ]
    for (const artist of data?.artists ?? []) {
      list.push({ kind: 'artist', key: `artist-${artist.id}`, artist })
    }
    for (const song of data?.songs ?? []) {
      list.push({ kind: 'song', key: `song-${song.id}`, song })
    }
    for (const album of data?.albums ?? []) {
      list.push({ kind: 'album', key: `album-${album.id}`, album })
    }
    for (const playlist of data?.playlists ?? []) {
      list.push({ kind: 'playlist', key: `playlist-${playlist.id}`, playlist })
    }
    return list
  }, [data, debouncedQuery])

  // A fresh result set shouldn't keep a stale highlight from the previous
  // query pointed at an item that no longer exists at that index. Reset
  // during render (not an effect) so it lands in the same commit as the new
  // list instead of flashing the stale highlight for one frame first.
  const [lastDebouncedQuery, setLastDebouncedQuery] = useState(debouncedQuery)
  if (debouncedQuery !== lastDebouncedQuery) {
    setLastDebouncedQuery(debouncedQuery)
    setActiveIndex(-1)
  }

  // Closing the dropdown (Escape, outside click) should drop the highlight
  // too — otherwise reopening it for the *same* query (so the item list
  // above never changes) leaves a stale activeIndex in place, and Enter
  // would silently jump to whatever was highlighted before instead of
  // searching the typed text.
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setActiveIndex(-1)
  }

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      // The dropdown is portaled to <body> (see the stacking-context note
      // below), so it's no longer a DOM descendant of containerRef — a
      // click inside it must still count as "inside", or this would close
      // the dropdown (and unmount the clicked item) on mousedown, before
      // its own onClick ever gets to fire.
      if (
        !containerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const showDropdown = open && debouncedQuery.length > 0

  // The topbar has `backdrop-blur`, which — like any CSS filter — creates
  // its own stacking context. A plain `position: absolute` dropdown nested
  // inside it would be trapped in that context no matter how high its
  // z-index, and would paint behind the main content area that follows the
  // topbar in the DOM. Portaling to <body> (the same escape hatch the
  // Popover/DropdownMenu/Select/Tooltip primitives already use) sidesteps
  // that entirely, so position is tracked manually from the input's own
  // bounding box instead of via `top-full`/`mt-2` relative to a parent.
  const [coords, setCoords] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  useLayoutEffect(() => {
    if (!showDropdown) return
    function updateCoords() {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width })
    }
    updateCoords()
    window.addEventListener('resize', updateCoords)
    return () => window.removeEventListener('resize', updateCoords)
  }, [showDropdown])

  function goToFullResults(q: string) {
    setOpen(false)
    navigate({ to: '/search', search: { q, category: 'all' } })
  }

  function selectItem(item: SuggestionItem) {
    setOpen(false)
    switch (item.kind) {
      case 'query':
        goToFullResults(item.text)
        break
      case 'artist':
        navigate({
          to: '/artist/$artistId',
          params: { artistId: item.artist.id },
        })
        break
      case 'album':
        navigate({ to: '/album/$albumId', params: { albumId: item.album.id } })
        break
      case 'playlist':
        navigate({
          to: '/playlist/$playlistId',
          params: { playlistId: item.playlist.id },
        })
        break
      case 'song':
        usePlayerStore.getState().setQueue([songToQueuedTrack(item.song)], 0)
        break
    }
  }

  function quickAction(item: SuggestionItem) {
    switch (item.kind) {
      case 'artist':
        void playArtist(item.artist.id)
        break
      case 'album':
        void playAlbum(item.album.id)
        break
      case 'playlist':
        void playPlaylist(item.playlist.id)
        break
      case 'song':
        usePlayerStore.getState().addToQueue(songToQueuedTrack(item.song))
        break
      case 'query':
        break
    }
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (items.length === 0) return
      setOpen(true)
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (items.length === 0) return
      setOpen(true)
      setActiveIndex((i) => (i - 1 + items.length) % items.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      // Only honor the highlight while the dropdown is actually visible —
      // otherwise a highlight set before an Escape/outside-click close (and
      // never cleared because the query never changed since) would make
      // Enter silently jump to a suggestion the user can no longer see.
      const active = open && activeIndex >= 0 ? items[activeIndex] : undefined
      if (active) {
        selectItem(active)
      } else if (query.trim()) {
        goToFullResults(query.trim())
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      }
    }
  }

  const showSkeleton = isFetching && !data

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-md">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={t('search.placeholder')}
        className="h-9 rounded-full pl-9 pr-9"
        aria-label={t('search.placeholder')}
        aria-expanded={showDropdown}
        aria-controls="global-search-listbox"
        aria-activedescendant={
          showDropdown && activeIndex >= 0 ? items[activeIndex]?.key : undefined
        }
        role="combobox"
        aria-autocomplete="list"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery('')
            setOpen(false)
          }}
          aria-label={t('search.clear')}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}

      {showDropdown &&
        coords &&
        createPortal(
          <div
            ref={dropdownRef}
            id="global-search-listbox"
            role="listbox"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed z-50 max-h-[28rem] min-w-80 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-md"
          >
            {showSkeleton ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              items.map((item, index) => (
                <SuggestionRow
                  key={item.key}
                  item={item}
                  active={index === activeIndex}
                  onSelect={() => selectItem(item)}
                  onQuickAction={() => quickAction(item)}
                  onHover={() => setActiveIndex(index)}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}

function SuggestionRow({
  item,
  active,
  onSelect,
  onQuickAction,
  onHover,
  onClose,
}: {
  item: SuggestionItem
  active: boolean
  onSelect: () => void
  onQuickAction: () => void
  onHover: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const rowClass = cn(
    'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left',
    active ? 'bg-accent' : 'hover:bg-accent',
  )

  if (item.kind === 'query') {
    return (
      <button
        type="button"
        role="option"
        aria-selected={active}
        id={item.key}
        className={rowClass}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <SearchIcon className="size-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {t('search.searchForQuery', { query: item.text })}
        </span>
      </button>
    )
  }

  function quickActionButton(label: string, icon: ReactNode) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onQuickAction()
        }}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
      >
        {icon}
      </button>
    )
  }

  function rowText(title: string, subtitle: string) {
    return (
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
    )
  }

  // The <Link> itself performs the navigation on click — calling the full
  // onSelect (which also navigates imperatively, for the keyboard-Enter
  // path below) here would race it with a second, redundant navigation.
  if (item.kind === 'artist') {
    return (
      <Link
        to="/artist/$artistId"
        params={{ artistId: item.artist.id }}
        role="option"
        aria-selected={active}
        id={item.key}
        className={rowClass}
        onMouseEnter={onHover}
        onClick={onClose}
      >
        <img
          src={getCoverArtUrl(item.artist.id, 'ar', 96)}
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
          loading="lazy"
        />
        {rowText(item.artist.name, t('search.resultType.artist'))}
        {quickActionButton(
          t('search.playAria', { name: item.artist.name }),
          <Play className="size-4 fill-current" />,
        )}
      </Link>
    )
  }

  if (item.kind === 'album') {
    return (
      <Link
        to="/album/$albumId"
        params={{ albumId: item.album.id }}
        role="option"
        aria-selected={active}
        id={item.key}
        className={rowClass}
        onMouseEnter={onHover}
        onClick={onClose}
      >
        <img
          src={getCoverArtUrl(item.album.id, 'al', 96)}
          alt=""
          className="size-10 shrink-0 rounded object-cover"
          loading="lazy"
        />
        {rowText(
          item.album.name,
          `${t('search.resultType.album')} · ${item.album.albumArtist}`,
        )}
        {quickActionButton(
          t('search.playAria', { name: item.album.name }),
          <Play className="size-4 fill-current" />,
        )}
      </Link>
    )
  }

  if (item.kind === 'playlist') {
    return (
      <Link
        to="/playlist/$playlistId"
        params={{ playlistId: item.playlist.id }}
        role="option"
        aria-selected={active}
        id={item.key}
        className={rowClass}
        onMouseEnter={onHover}
        onClick={onClose}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
          <ListMusic className="size-4 text-muted-foreground" />
        </span>
        {rowText(item.playlist.name, t('search.resultType.playlist'))}
        {quickActionButton(
          t('search.playAria', { name: item.playlist.name }),
          <Play className="size-4 fill-current" />,
        )}
      </Link>
    )
  }

  // A plain <div> (not a <button>) — it contains the quick-action button
  // below, and a <button> can't nest another interactive element without
  // producing invalid/auto-corrected HTML that breaks click targeting.
  // Keyboard reachability comes from the combobox input's arrow-key
  // navigation (aria-activedescendant), not from this row being a tab stop.
  return (
    <div
      role="option"
      aria-selected={active}
      id={item.key}
      className={rowClass}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      <img
        src={getCoverArtUrl(item.song.albumId, 'al', 96)}
        alt=""
        className="size-10 shrink-0 rounded object-cover"
        loading="lazy"
      />
      {rowText(
        item.song.title,
        `${t('search.resultType.song')} · ${item.song.artist}`,
      )}
      {quickActionButton(
        t('search.addToQueueAria', { title: item.song.title }),
        <Plus className="size-4" />,
      )}
    </div>
  )
}
