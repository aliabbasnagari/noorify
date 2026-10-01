import { apiFetch } from "@/lib/api/http"
import { getList } from "@/lib/api/http"
import type { PlaylistTrack, Song } from "@/lib/api/types"
import {
  playlistTrackToQueuedTrack,
  songToQueuedTrack,
  usePlayerStore,
} from "@/stores/player-store"

/** Shared by every "Play" button across cards, rows, and detail pages —
 * factored out once three-plus call sites needed the same
 * fetch-then-enqueue shape. */

export async function playAlbum(albumId: string, startIndex = 0) {
  const { data } = await getList<Song>("song", {
    filter: { album_id: albumId },
    sort: "track_number",
    end: 2000,
  })
  usePlayerStore.getState().setQueue(data.map(songToQueuedTrack), startIndex)
}

/** No curated "top tracks" source wired yet (Subsonic getTopSongs, used by
 * the artist detail page instead) — shuffle a sample of the artist's
 * catalog, same idea as Spotify's artist-page shuffle-play default. */
export async function playArtist(artistId: string) {
  const { data } = await getList<Song>("song", {
    filter: { artist_id: artistId },
    sort: "random",
    end: 50,
  })
  usePlayerStore.getState().setQueue(data.map(songToQueuedTrack), 0)
}

export async function playPlaylist(playlistId: string, startIndex = 0) {
  const tracks = await apiFetch<PlaylistTrack[]>(
    `/api/playlist/${playlistId}/tracks?_end=2000`,
  )
  usePlayerStore
    .getState()
    .setQueue(tracks.map(playlistTrackToQueuedTrack), startIndex)
}
