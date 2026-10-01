import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { Order } from "@/lib/api/http"
import { useInfiniteResourceList } from "@/hooks/use-resource-list"
import { VirtualizedGrid } from "@/components/library/virtualized-grid"
import { ArtistCard } from "@/components/library/artist-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Artist } from "@/lib/api/types"

interface SortOption {
  value: string
  labelKey: string
  order: Order
}

const SORT_OPTIONS: SortOption[] = [
  { value: "name", labelKey: "artists.sortName", order: "ASC" },
  {
    value: "album_count",
    labelKey: "artists.sortMostAlbums",
    order: "DESC",
  },
  { value: "random", labelKey: "artists.sortRandom", order: "ASC" },
]

export default function ArtistsPage() {
  const { t } = useTranslation()
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0].value)
  const sort =
    SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0]

  const {
    items,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteResourceList<Artist>("artist", {
    sort: sort.value,
    order: sort.order,
  })

  return (
    <div className="flex h-full flex-col gap-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("artists.title")}</h1>
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
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <VirtualizedGrid
          className="min-h-0 flex-1"
          items={items}
          total={total}
          itemMinWidth={150}
          itemHeight={210}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          renderItem={(artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          )}
          emptyMessage={t("artists.emptyMessage")}
        />
      )}
    </div>
  )
}
