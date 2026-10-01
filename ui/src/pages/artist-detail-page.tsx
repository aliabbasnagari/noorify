import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Play, Share2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getList, getOne } from "@/lib/api/http"
import { getArtistInfo, getCoverArtUrl, getTopSongs } from "@/lib/api/subsonic"
import type { Album, Artist, Song, SubsonicTopSong } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { StarButton } from "@/components/library/star-button"
import { SongRow } from "@/components/library/song-row"
import { AlbumCard } from "@/components/library/album-card"
import { ArtistCard } from "@/components/library/artist-card"
import { ShareDialog } from "@/components/library/share-dialog"
import { ArtHeroBackground } from "@/components/library/art-hero-background"
import { config } from "@/lib/config"
import { playArtist } from "@/lib/player/play-actions"
import {
  songToQueuedTrack,
  useCurrentTrack,
  usePlayerStore,
} from "@/stores/player-store"

function topSongToSong(topSong: SubsonicTopSong, artistId: string): Song {
  return {
    id: topSong.id,
    title: topSong.title,
    artist: topSong.artist,
    artistId,
    albumId: topSong.albumId,
    album: topSong.album,
    duration: topSong.duration,
    trackNumber: topSong.track,
    // Subsonic's Child schema does carry starred/rating, but getting them
    // right here would mean a second fetch per song — the star/rating
    // buttons below still act on the song's real id, they just can't show
    // its true state without that fetch.
    starred: false,
    rating: 0,
  }
}

export default function ArtistDetailPage({ artistId }: { artistId: string }) {
  const { t } = useTranslation()
  const [bioExpanded, setBioExpanded] = useState(false)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const currentTrack = useCurrentTrack()

  const { data: artist, isLoading: artistLoading } = useQuery({
    queryKey: ["artist", "detail", artistId],
    queryFn: () => getOne<Artist>("artist", artistId),
  })

  const { data: albumsResult } = useQuery({
    queryKey: ["album", "list", "by-artist", artistId],
    queryFn: () =>
      getList<Album>("album", {
        filter: { album_artist_id: artistId },
        sort: "max_year",
        order: "DESC",
        end: 100,
      }),
  })

  const { data: topSongs } = useQuery({
    queryKey: ["song", "top-songs", artist?.name],
    queryFn: () => getTopSongs(artist!.name),
    enabled: !!artist,
  })

  const { data: artistInfo } = useQuery({
    queryKey: ["artist", "info", artistId],
    queryFn: () => getArtistInfo(artistId),
  })

  if (artistLoading)
    return <p className="py-16 text-muted-foreground">{t("artist.loading")}</p>
  if (!artist)
    return (
      <p className="py-16 text-muted-foreground">
        {t("artist.artistNotFound")}
      </p>
    )

  const albums = albumsResult?.data ?? []
  const songs = (topSongs ?? []).map((s) => topSongToSong(s, artist.id))
  const similarArtists = (artistInfo?.similarArtist ?? []).filter(
    (a) => a.id !== "-1",
  )
  const biography = artist.biography?.trim()
  const artistImageUrl = getCoverArtUrl(artist.id, "ar", 500)

  return (
    <div className="relative">
      <ArtHeroBackground imageUrl={artistImageUrl} />

      <div className="flex flex-col items-start gap-6 py-8 sm:flex-row sm:items-end">
        <img
          src={artistImageUrl}
          alt=""
          draggable={false}
          className="size-48 shrink-0 rounded-full object-cover shadow-lg"
        />
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {t("artist.artist")}
          </p>
          <h1 className="text-4xl font-bold text-balance">{artist.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("artist.albumCount", { count: artist.albumCount })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pb-6">
        <Button
          size="icon"
          className="size-12 rounded-full"
          aria-label={t("artist.playName", { name: artist.name })}
          onClick={() => void playArtist(artist.id)}
        >
          <Play className="size-5 fill-current" />
        </Button>
        <StarButton resource="artist" id={artist.id} starred={artist.starred} />
        {config.enableSharing && (
          <ShareDialog
            resourceIds={[artist.id]}
            trigger={
              <Button variant="outline" size="sm">
                <Share2 className="size-3.5" />
                {t("artist.share")}
              </Button>
            }
          />
        )}
      </div>

      {biography && (
        <section className="max-w-2xl space-y-1 pb-8">
          <h2 className="text-lg font-semibold">{t("artist.about")}</h2>
          <p
            className={
              bioExpanded
                ? "text-sm text-muted-foreground"
                : "line-clamp-3 text-sm text-muted-foreground"
            }
          >
            {biography}
          </p>
          <button
            type="button"
            onClick={() => setBioExpanded((v) => !v)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            {bioExpanded ? t("artist.showLess") : t("artist.readMore")}
          </button>
        </section>
      )}

      {songs.length > 0 && (
        <section className="max-w-2xl space-y-1 pb-8">
          <h2 className="text-lg font-semibold">{t("artist.popular")}</h2>
          {songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index}
              showAlbum
              active={currentTrack?.id === song.id}
              onPlay={() => setQueue(songs.map(songToQueuedTrack), index)}
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
        </section>
      )}

      {albums.length > 0 && (
        <section className="space-y-3 pb-8">
          <h2 className="text-lg font-semibold">{t("artist.discography")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {similarArtists.length > 0 && (
        <section className="space-y-3 pb-16">
          <h2 className="text-lg font-semibold">{t("artist.fansAlsoLike")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {similarArtists.map((similar) => (
              <ArtistCard
                key={similar.id}
                artist={{
                  id: similar.id,
                  name: similar.name,
                  albumCount: similar.albumCount,
                  starred: false,
                  rating: 0,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
