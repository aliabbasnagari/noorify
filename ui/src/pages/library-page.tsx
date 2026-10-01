import { Link } from "@tanstack/react-router"
import { Disc3, ListMusic, Mic2, Music, Radio } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useResourceList } from "@/hooks/use-resource-list"
import { PlaylistRow } from "@/components/library/playlist-row"
import { CreatePlaylistDialog } from "@/components/library/create-playlist-dialog"
import type { Playlist } from "@/lib/api/types"

const SECTIONS = [
  { to: "/albums" as const, icon: Disc3, labelKey: "library.albums" },
  { to: "/artists" as const, icon: Mic2, labelKey: "library.artists" },
  { to: "/songs" as const, icon: Music, labelKey: "library.songs" },
  { to: "/radio" as const, icon: Radio, labelKey: "library.radio" },
]

/** The mobile "Your Library" hub (see mobile-tab-bar.tsx's doc comment) —
 * aggregates the destinations the desktop sidebar links to directly, since
 * a phone-width bottom bar has no room for one tab per section. Also a
 * perfectly normal destination at any viewport width; nothing here is
 * mobile-exclusive, there's just no dedicated nav entry point to it on
 * desktop (the sidebar already covers the same ground). */
export default function LibraryPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useResourceList<Playlist>("playlist", {
    sort: "name",
    order: "ASC",
    end: 200,
  })

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-bold">{t("library.yourLibrary")}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SECTIONS.map(({ to, icon: Icon, labelKey }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-md border border-border p-4 text-center hover:bg-accent"
          >
            <Icon className="size-6" />
            <span className="text-sm font-medium">{t(labelKey)}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("library.playlists")}</h2>
        <CreatePlaylistDialog />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("library.loading")}</p>
      ) : data && data.data.length > 0 ? (
        <div className="space-y-1">
          {data.data.map((playlist) => (
            <PlaylistRow key={playlist.id} playlist={playlist} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          <ListMusic className="mx-auto mb-2 size-8" />
          {t("library.noPlaylistsYet")}
        </p>
      )}
    </div>
  )
}
