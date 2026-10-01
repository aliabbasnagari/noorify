import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Search as SearchIcon } from "lucide-react"
import { getList } from "@/lib/api/http"
import { search3 } from "@/lib/api/subsonic"
import type { Playlist } from "@/lib/api/types"
import { Input } from "@/components/ui/input"
import { AlbumCard } from "@/components/library/album-card"
import { ArtistCard } from "@/components/library/artist-card"
import { PlaylistRow } from "@/components/library/playlist-row"
import { SongRow } from "@/components/library/song-row"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { songToQueuedTrack, useCurrentTrack, usePlayerStore } from "@/stores/player-store"

function searchPlaylists(query: string) {
  return getList<Playlist>("playlist", { filter: { q: query }, end: 10 })
}

export default function SearchPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const currentTrack = useCurrentTrack()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      const [subsonic, playlists] = await Promise.all([
        search3(debouncedQuery),
        searchPlaylists(debouncedQuery),
      ])
      return { ...subsonic, playlists: playlists.data }
    },
    enabled: debouncedQuery.length > 0,
  })

  const hasQuery = debouncedQuery.length > 0
  const hasResults =
    !!data &&
    (data.artists.length > 0 ||
      data.albums.length > 0 ||
      data.songs.length > 0 ||
      data.playlists.length > 0)

  return (
    <div className="space-y-6 py-6">
      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="pl-9"
          autoFocus
        />
      </div>

      {!hasQuery ? (
        <p className="py-12 text-center text-muted-foreground">
          {t("search.prompt")}
        </p>
      ) : isLoading ? (
        <p className="text-muted-foreground">{t("search.searching")}</p>
      ) : !hasResults ? (
        <p className="py-12 text-center text-muted-foreground">
          {t("search.noResults", { query: debouncedQuery })}
        </p>
      ) : (
        <div className={isFetching ? "space-y-8 opacity-60" : "space-y-8"}>
          {data.artists.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">{t("search.artists")}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {data.artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {data.albums.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">{t("search.albums")}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {data.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {data.songs.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">{t("search.songs")}</h2>
              <div>
                {data.songs.map((song, index) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={index}
                    showAlbum
                    active={currentTrack?.id === song.id}
                    onPlay={() =>
                      setQueue(data.songs.map(songToQueuedTrack), index)
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
                ))}
              </div>
            </section>
          )}

          {data.playlists.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">
                {t("search.playlists")}
              </h2>
              <div>
                {data.playlists.map((playlist) => (
                  <PlaylistRow key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
