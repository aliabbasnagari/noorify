import { useTranslation } from "react-i18next"
import { useResourceList } from "@/hooks/use-resource-list"
import { PlaylistRow } from "@/components/library/playlist-row"
import { CreatePlaylistDialog } from "@/components/library/create-playlist-dialog"
import type { Playlist } from "@/lib/api/types"

// Playlist counts don't approach album/artist/song scale, so a bounded
// (non-virtualized, non-paginated) list is enough — see the Albums/Artists
// pages for the virtualization spike this phase actually needed.
export default function PlaylistsPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useResourceList<Playlist>("playlist", {
    sort: "name",
    order: "ASC",
    end: 500,
  })

  return (
    <div className="flex h-full flex-col gap-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("playlists.playlists")}</h1>
        <CreatePlaylistDialog />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t("playlists.loading")}</p>
      ) : data && data.data.length > 0 ? (
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {data.data.map((playlist) => (
            <PlaylistRow key={playlist.id} playlist={playlist} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          {t("playlists.noPlaylistsYet")}
        </p>
      )}
    </div>
  )
}
