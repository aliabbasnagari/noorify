import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Play, Share2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getList, getOne } from "@/lib/api/http"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import type { Album, Song } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { StarButton } from "@/components/library/star-button"
import { RatingStars } from "@/components/library/rating-stars"
import { SongRow } from "@/components/library/song-row"
import { ShareDialog } from "@/components/library/share-dialog"
import { ArtHeroBackground } from "@/components/library/art-hero-background"
import { config } from "@/lib/config"
import { formatDuration } from "@/lib/format"
import { playAlbum } from "@/lib/player/play-actions"
import {
  songToQueuedTrack,
  useCurrentTrack,
  usePlayerStore,
} from "@/stores/player-store"

function groupByDisc(songs: Song[]): [number, Song[]][] {
  const map = new Map<number, Song[]>()
  for (const song of songs) {
    const disc = song.discNumber ?? 1
    const list = map.get(disc) ?? []
    list.push(song)
    map.set(disc, list)
  }
  return [...map.entries()].sort(([a], [b]) => a - b)
}

export default function AlbumDetailPage({ albumId }: { albumId: string }) {
  const { t } = useTranslation()
  const { data: album, isLoading: albumLoading } = useQuery({
    queryKey: ["album", "detail", albumId],
    queryFn: () => getOne<Album>("album", albumId),
  })

  const { data: songsResult, isLoading: songsLoading } = useQuery({
    queryKey: ["song", "list", "by-album", albumId],
    queryFn: () =>
      getList<Song>("song", {
        filter: { album_id: albumId },
        sort: "track_number",
        end: 1000,
      }),
  })

  // Stable sort keeps the server's track_number order within each disc.
  const songs = useMemo(() => {
    const list = songsResult?.data ?? []
    return [...list].sort((a, b) => (a.discNumber ?? 1) - (b.discNumber ?? 1))
  }, [songsResult])
  const discGroups = useMemo(() => groupByDisc(songs), [songs])

  const setQueue = usePlayerStore((s) => s.setQueue)
  const currentTrack = useCurrentTrack()

  if (albumLoading)
    return <p className="py-16 text-muted-foreground">{t("album.loading")}</p>
  if (!album)
    return (
      <p className="py-16 text-muted-foreground">{t("album.albumNotFound")}</p>
    )

  const coverArtUrl = getCoverArtUrl(album.id, "al", 600)

  return (
    <div className="relative">
      <ArtHeroBackground imageUrl={coverArtUrl} />

      <div className="flex flex-col items-start gap-6 py-8 sm:flex-row sm:items-end">
        <img
          src={coverArtUrl}
          alt=""
          draggable={false}
          className="size-48 shrink-0 rounded object-cover shadow-lg"
        />
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {t("album.album")}
          </p>
          <h1 className="text-4xl font-bold text-balance">{album.name}</h1>
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
            <Link
              to="/artist/$artistId"
              params={{ artistId: album.albumArtistId }}
              className="font-medium text-foreground hover:underline"
            >
              {album.albumArtist}
            </Link>
            {album.maxYear ? <span>· {album.maxYear}</span> : null}
            <span>· {t("album.songCount", { count: album.songCount })}</span>
            <span>· {formatDuration(album.duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pb-6">
        <Button
          size="icon"
          className="size-12 rounded-full"
          aria-label={t("album.playName", { name: album.name })}
          onClick={() => playAlbum(album.id)}
        >
          <Play className="size-5 fill-current" />
        </Button>
        <StarButton resource="album" id={album.id} starred={album.starred} />
        <RatingStars resource="album" id={album.id} rating={album.rating} />
        {config.enableSharing && (
          <ShareDialog
            resourceIds={[album.id]}
            trigger={
              <Button variant="outline" size="sm">
                <Share2 className="size-3.5" />
                {t("album.share")}
              </Button>
            }
          />
        )}
      </div>

      {songsLoading ? (
        <p className="text-muted-foreground">{t("album.loadingTracks")}</p>
      ) : (
        <div className="space-y-4 pb-16">
          {discGroups.map(([disc, discSongs]) => (
            <div key={disc}>
              {discGroups.length > 1 && (
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  {t("album.discNumber", { n: disc })}
                </h3>
              )}
              {discSongs.map((song) => {
                const queuePosition = songs.findIndex((s) => s.id === song.id)
                return (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={queuePosition}
                    displayNumber={song.trackNumber}
                    active={currentTrack?.id === song.id}
                    onPlay={() =>
                      setQueue(songs.map(songToQueuedTrack), queuePosition)
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
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
