import { toast } from 'sonner'
import i18n from '@/i18n'
import { getRandomSongs, getSimilarSongs } from '@/lib/api/subsonic'
import type { Song } from '@/lib/api/types'
import { songToQueuedTrack, usePlayerStore } from '@/stores/player-store'
import type { QueuedTrack } from '@/stores/player-store'

const MIX_SIZE = 50

/**
 * Up to `count` tracks "like" `seedId` (a song, album, artist, playlist or
 * genre id), skipping anything in `exclude`. The server already tops its
 * similar-songs list up from the library when no external agent is
 * configured, so the random fallback only matters when that call fails or
 * comes back empty — it keeps Autoplay from going silent on a flaky or
 * brand-new library. `genre` narrows the fallback when the seed's known.
 */
export async function fetchMixTracks(
  seedId: string,
  count: number,
  exclude: ReadonlySet<string>,
  genre?: string,
): Promise<QueuedTrack[]> {
  // Ask for extra: the exclude set (usually the whole queue) can eat into it.
  const want = count + exclude.size
  const pick = (songs: Song[]) => {
    const seen = new Set(exclude)
    const out: QueuedTrack[] = []
    for (const song of songs) {
      if (seen.has(song.id)) continue
      seen.add(song.id)
      out.push(songToQueuedTrack(song))
      if (out.length === count) break
    }
    return out
  }

  let tracks = pick(await getSimilarSongs(seedId, want).catch(() => []))
  if (tracks.length === 0 && genre) {
    tracks = pick(await getRandomSongs({ size: want, genre }).catch(() => []))
  }
  if (tracks.length === 0) {
    tracks = pick(await getRandomSongs({ size: want }).catch(() => []))
  }
  return tracks
}

/** Replaces the queue with a mix seeded by `seedId`. When `song` is given
 * (starting a mix from a track), that track plays first. Toasts on its own
 * if nothing could be found. */
export async function playInstantMix(seedId: string, song?: Song) {
  try {
    const first = song ? [songToQueuedTrack(song)] : []
    const exclude = new Set(first.map((t) => t.id))
    const mix = await fetchMixTracks(seedId, MIX_SIZE, exclude, song?.genre)
    if (first.length + mix.length === 0) {
      toast.error(i18n.t('instantMix.empty'))
      return
    }
    usePlayerStore.getState().setQueue([...first, ...mix], 0)
    toast.success(i18n.t('instantMix.started'))
  } catch {
    toast.error(i18n.t('errors.actionFailed'))
  }
}
