import { useTranslation } from "react-i18next"
import { useResourceList } from "@/hooks/use-resource-list"
import { Shelf } from "@/components/library/shelf"
import { AlbumCard } from "@/components/library/album-card"
import type { Album } from "@/lib/api/types"
import type { ListParams } from "@/lib/api/http"

const SHELF_SIZE = 20

interface ShelfConfig {
  titleKey: string
  params: ListParams
}

// Same sort/filter combos old-ui's albumLists.jsx used (confirmed against
// the server's actual filter/sort vocabulary) — "all" is skipped here since
// that's just the /albums page, not a Home shelf.
const SHELVES: ShelfConfig[] = [
  {
    titleKey: "home.recentlyAdded",
    params: { sort: "recently_added", order: "DESC" },
  },
  {
    titleKey: "home.recentlyPlayed",
    params: {
      sort: "play_date",
      order: "DESC",
      filter: { recently_played: true },
    },
  },
  {
    titleKey: "home.mostPlayed",
    params: {
      sort: "play_count",
      order: "DESC",
      filter: { recently_played: true },
    },
  },
  {
    titleKey: "home.favorites",
    params: { sort: "starred_at", order: "DESC", filter: { starred: true } },
  },
  {
    titleKey: "home.topRated",
    params: { sort: "rating", order: "DESC", filter: { has_rating: true } },
  },
  { titleKey: "home.randomPicks", params: { sort: "random" } },
]

function AlbumShelf({ titleKey, params }: ShelfConfig) {
  const { t } = useTranslation()
  const { data, isLoading } = useResourceList<Album>("album", {
    ...params,
    end: SHELF_SIZE,
  })
  return (
    <Shelf
      title={t(titleKey)}
      items={data?.data ?? []}
      isLoading={isLoading}
      renderItem={(album) => <AlbumCard album={album} />}
    />
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-8 py-8">
      <h1 className="text-2xl font-bold">{t("home.title")}</h1>
      {SHELVES.map((shelf) => (
        <AlbumShelf key={shelf.titleKey} {...shelf} />
      ))}
    </div>
  )
}
