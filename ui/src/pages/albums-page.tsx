import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { Order } from "@/lib/api/http"
import { useInfiniteResourceList } from "@/hooks/use-resource-list"
import { VirtualizedGrid } from "@/components/library/virtualized-grid"
import { AlbumCard } from "@/components/library/album-card"
import { AlbumListRow } from "@/components/library/album-list-row"
import { ViewToggle } from "@/components/library/view-toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUiStore } from "@/stores/ui-store"
import type { Album } from "@/lib/api/types"

interface SortOption {
  value: string
  labelKey: string
  order: Order
}

const SORT_OPTIONS: SortOption[] = [
  { value: "name", labelKey: "albums.sortName", order: "ASC" },
  {
    value: "recently_added",
    labelKey: "albums.sortRecentlyAdded",
    order: "DESC",
  },
  { value: "album_artist", labelKey: "albums.sortArtist", order: "ASC" },
  { value: "max_year", labelKey: "albums.sortYear", order: "DESC" },
  { value: "play_count", labelKey: "albums.sortMostPlayed", order: "DESC" },
  { value: "random", labelKey: "albums.sortRandom", order: "ASC" },
]

export default function AlbumsPage() {
  const { t } = useTranslation()
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0].value)
  const sort =
    SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0]
  const viewMode = useUiStore((s) => s.albumsViewMode)

  const {
    items,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteResourceList<Album>("album", {
    sort: sort.value,
    order: sort.order,
  })

  return (
    <div className="flex h-full flex-col gap-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("albums.title")}</h1>
        <div className="flex items-center gap-2">
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
          <ViewToggle />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : viewMode === "grid" ? (
        <VirtualizedGrid
          className="min-h-0 flex-1"
          items={items}
          total={total}
          itemMinWidth={168}
          itemHeight={230}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          renderItem={(album) => <AlbumCard key={album.id} album={album} />}
          emptyMessage={t("albums.emptyMessage")}
        />
      ) : (
        <VirtualizedGrid
          className="min-h-0 flex-1"
          items={items}
          total={total}
          itemMinWidth={0}
          itemHeight={56}
          columns={1}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          renderItem={(album) => <AlbumListRow key={album.id} album={album} />}
          emptyMessage={t("albums.emptyMessage")}
        />
      )}
    </div>
  )
}
