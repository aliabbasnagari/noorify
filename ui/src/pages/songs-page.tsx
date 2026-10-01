import { useState } from "react"
import { Columns3, Heart } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Order } from "@/lib/api/http"
import { useInfiniteResourceList } from "@/hooks/use-resource-list"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { VirtualizedGrid } from "@/components/library/virtualized-grid"
import { SongRow } from "@/components/library/song-row"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useResourceList } from "@/hooks/use-resource-list"
import { config } from "@/lib/config"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  songToQueuedTrack,
  useCurrentTrack,
  usePlayerStore,
} from "@/stores/player-store"
import type { Genre, Song, Tag } from "@/lib/api/types"

interface SortOption {
  value: string
  labelKey: string
  order: Order
}

const SORT_OPTIONS: SortOption[] = [
  { value: "title", labelKey: "songs.sortTitle", order: "ASC" },
  { value: "artist", labelKey: "songs.sortArtist", order: "ASC" },
  { value: "album", labelKey: "songs.sortAlbum", order: "ASC" },
  {
    value: "recently_added",
    labelKey: "songs.sortRecentlyAdded",
    order: "DESC",
  },
  { value: "year", labelKey: "songs.sortYear", order: "DESC" },
  { value: "play_count", labelKey: "songs.sortMostPlayed", order: "DESC" },
  { value: "random", labelKey: "songs.sortRandom", order: "ASC" },
]

const ALL = "__all__"
const COLUMNS_KEY = "songs.extraColumns"

type ColumnKey = "genre" | "year" | "mood" | "playCount" | "bpm"

const COLUMNS: {
  key: ColumnKey
  labelKey: string
  get: (song: Song) => string | undefined
}[] = [
  {
    key: "genre",
    labelKey: "songs.colGenre",
    get: (s) => s.genre || undefined,
  },
  {
    key: "year",
    labelKey: "songs.colYear",
    get: (s) => (s.year ? String(s.year) : undefined),
  },
  { key: "mood", labelKey: "songs.colMood", get: (s) => s.tags?.mood?.[0] },
  {
    key: "playCount",
    labelKey: "songs.colPlayCount",
    get: (s) => (s.playCount ? `${s.playCount} plays` : undefined),
  },
  {
    key: "bpm",
    labelKey: "songs.colBpm",
    get: (s) => (s.bpm ? `${s.bpm} bpm` : undefined),
  },
]

function loadColumns(): ColumnKey[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COLUMNS_KEY) ?? "[]")
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string
  onChange: (v: string) => void
  allLabel: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-40">
        <SelectValue>
          {value === ALL
            ? allLabel
            : (options.find((o) => o.value === value)?.label ?? allLabel)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function SongsPage() {
  const { t } = useTranslation()
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0].value)
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const sort =
    SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0]
  const [genreId, setGenreId] = useState(ALL)
  const [moodId, setMoodId] = useState(ALL)
  const [starredOnly, setStarredOnly] = useState(false)
  const [columns, setColumns] = useState<ColumnKey[]>(loadColumns)
  const { data: genres } = useResourceList<Genre>("genre", {
    sort: "name",
    order: "ASC",
    end: 1000,
  })
  const { data: moods } = useResourceList<Tag>("tag", {
    sort: "tagValue",
    order: "ASC",
    filter: { tag_name: "mood" },
    end: 1000,
  })
  const toggleColumn = (key: ColumnKey, on: boolean) => {
    const next = on ? [...columns, key] : columns.filter((c) => c !== key)
    setColumns(next)
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable — keep the in-memory choice only
    }
  }
  const currentTrack = useCurrentTrack()
  const setQueue = usePlayerStore((s) => s.setQueue)

  const {
    items,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteResourceList<Song>("song", {
    sort: sort.value,
    order: sort.order,
    filter: {
      ...(debouncedQuery && { title: debouncedQuery }),
      ...(genreId !== ALL && { genre_id: [genreId] }),
      ...(moodId !== ALL && { mood: [moodId] }),
      ...(starredOnly && { starred: true }),
    },
  })

  return (
    <div className="flex h-full flex-col gap-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("songs.title")}</h1>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("songs.searchPlaceholder")}
            aria-label={t("songs.searchPlaceholder")}
            className="w-48"
          />
          <FilterSelect
            value={genreId}
            onChange={setGenreId}
            allLabel={t("songs.allGenres")}
            options={(genres?.data ?? []).map((g) => ({
              value: g.id,
              label: g.name,
            }))}
          />
          {(moods?.data.length ?? 0) > 0 && (
            <FilterSelect
              value={moodId}
              onChange={setMoodId}
              allLabel={t("songs.allMoods")}
              options={(moods?.data ?? []).map((m) => ({
                value: m.id,
                label: m.tagValue,
              }))}
            />
          )}
          {config.enableFavourites && (
            <Button
              variant={starredOnly ? "default" : "outline"}
              size="icon"
              aria-pressed={starredOnly}
              aria-label={t("songs.favouritesOnly")}
              onClick={() => setStarredOnly((v) => !v)}
            >
              <Heart
                className={starredOnly ? "size-4 fill-current" : "size-4"}
              />
            </Button>
          )}
          <Select
            value={sortValue}
            onValueChange={(value) => value && setSortValue(value)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("songs.columns")}
                />
              }
            >
              <Columns3 className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {COLUMNS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={columns.includes(c.key)}
                  onCheckedChange={(on) => toggleColumn(c.key, !!on)}
                >
                  {t(c.labelKey)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <VirtualizedGrid
          className="min-h-0 flex-1"
          items={items}
          total={total}
          itemMinWidth={0}
          itemHeight={52}
          gap={0}
          columns={1}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          renderItem={(song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index}
              showAlbum
              extras={COLUMNS.filter((c) => columns.includes(c.key))
                .map((c) => c.get(song))
                .filter((v): v is string => !!v)}
              active={currentTrack?.id === song.id}
              onPlay={() => setQueue(items.map(songToQueuedTrack), index)}
              onPlayNext={() =>
                usePlayerStore
                  .getState()
                  .playNextInQueue(songToQueuedTrack(song))
              }
              onAddToQueue={() =>
                usePlayerStore.getState().addToQueue(songToQueuedTrack(song))
              }
            />
          )}
          emptyMessage={t("songs.emptyMessage")}
        />
      )}
    </div>
  )
}
