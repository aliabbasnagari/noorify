import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { SongRow } from "@/components/library/song-row"
import { useInfiniteResourceList } from "@/hooks/use-resource-list"
import {
  songToQueuedTrack,
  useCurrentTrack,
  usePlayerStore,
} from "@/stores/player-store"
import type { Song } from "@/lib/api/types"

/** Every song the artist appears on (as artist or album artist), regardless
 * of album. The artist page scrolls as a whole, so this pages with a "Load
 * more" button rather than a nested virtualized scroller. */
export function ArtistSongs({ artistId }: { artistId: string }) {
  const { t } = useTranslation()
  const currentTrack = useCurrentTrack()
  const setQueue = usePlayerStore((s) => s.setQueue)
  const {
    items,
    total,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteResourceList<Song>("song", {
    sort: "title",
    order: "ASC",
    filter: { artists_id: [artistId] },
  })

  if (isLoading)
    return <p className="text-muted-foreground">{t("common.loading")}</p>
  if (items.length === 0)
    return <p className="text-muted-foreground">{t("artist.noSongs")}</p>

  return (
    <div className="space-y-1">
      <p className="pb-1 text-sm text-muted-foreground">
        {t("artist.songCount", { count: total })}
      </p>
      {items.map((song, index) => (
        <SongRow
          key={song.id}
          song={song}
          index={index}
          showAlbum
          active={currentTrack?.id === song.id}
          onPlay={() => setQueue(items.map(songToQueuedTrack), index)}
          onPlayNext={() =>
            usePlayerStore.getState().playNextInQueue(songToQueuedTrack(song))
          }
          onAddToQueue={() =>
            usePlayerStore.getState().addToQueue(songToQueuedTrack(song))
          }
        />
      ))}
      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {t("artist.loadMore")}
        </Button>
      )}
    </div>
  )
}
