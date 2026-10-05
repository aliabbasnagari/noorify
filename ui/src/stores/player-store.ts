import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { PlaylistTrack, Radio, Song } from "@/lib/api/types"

export interface QueuedTrack {
  id: string
  title: string
  artist: string
  albumId: string
  albumTitle: string
  durationSeconds: number
  /** Internet radio stations play their own raw stream URL directly (no
   * Navidrome transcode/proxy) and skip scrobble reporting entirely — see
   * the audio engine's isRadio branches. */
  isRadio?: boolean
  streamUrl?: string
}

export function songToQueuedTrack(song: Song): QueuedTrack {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    albumId: song.albumId,
    albumTitle: song.album,
    durationSeconds: song.duration,
  }
}

export function radioToQueuedTrack(radio: Radio): QueuedTrack {
  return {
    id: radio.id,
    title: radio.name,
    artist: "Radio",
    albumId: "",
    albumTitle: radio.homePageUrl ?? "",
    durationSeconds: 0,
    isRadio: true,
    streamUrl: radio.streamUrl,
  }
}

/** `PlaylistTrack.id` is the playlist-row id, not the song's — using it for
 * playback would request the wrong id for streaming/art/scrobbling. See
 * the type's own doc comment in lib/api/types.ts. */
export function playlistTrackToQueuedTrack(track: PlaylistTrack): QueuedTrack {
  return songToQueuedTrack({ ...track, id: track.mediaFileId })
}

export type RepeatMode = "off" | "all" | "one"

interface PlayerState {
  queue: QueuedTrack[]
  currentIndex: number // -1 when the queue is empty
  /** Bumped on every explicit "play this entry now" action (setQueue,
   * playTrackAt, next/previous, repeat-wrap) so the audio engine restarts
   * playback even when the target has the same id as the current track
   * (repeat-all on a 1-track queue, the same song queued twice in a row,
   * re-clicking Play on the current song). */
  playNonce: number
  shuffle: boolean
  /** Queue order as it was before shuffle was enabled, so toggling it back
   * off restores it instead of leaving the queue permanently shuffled. */
  unshuffledQueue: QueuedTrack[] | null
  repeatMode: RepeatMode
  /** Set by restoreQueue: the audio engine loads the current track paused
   * and seeks here (seconds) instead of autoplaying, then clears it. */
  resumeAt: number | null
  volume: number // 0-100
  muted: boolean

  // Telemetry: written only by the audio engine (src/lib/player/audio-engine.ts),
  // read everywhere else. UI actions never set these directly, so the UI
  // can't drift from what the real <audio> element is actually doing.
  isPlaying: boolean
  isBuffering: boolean
  currentTime: number
  duration: number
  setTelemetry: (
    telemetry: Partial<
      Pick<
        PlayerState,
        "isPlaying" | "isBuffering" | "currentTime" | "duration"
      >
    >,
  ) => void

  setQueue: (tracks: QueuedTrack[], startIndex?: number) => void
  /** Loads a previously saved queue paused at `positionSeconds`. */
  restoreQueue: (
    tracks: QueuedTrack[],
    index: number,
    positionSeconds: number,
  ) => void
  playTrackAt: (index: number) => void
  playNext: () => void
  playPrevious: () => void
  addToQueue: (track: QueuedTrack) => void
  playNextInQueue: (track: QueuedTrack) => void
  removeFromQueue: (index: number) => void
  moveInQueue: (index: number, direction: -1 | 1) => void
  toggleShuffle: () => void
  cycleRepeatMode: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

function shuffleAfter<T>(items: T[], index: number): T[] {
  const head = items.slice(0, index + 1)
  const tail = items.slice(index + 1)
  for (let i = tail.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tail[i], tail[j]] = [tail[j], tail[i]]
  }
  return [...head, ...tail]
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: -1,
      playNonce: 0,
      shuffle: false,
      unshuffledQueue: null,
      repeatMode: "off",
      resumeAt: null,
      volume: 100,
      muted: false,

      isPlaying: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      setTelemetry: (telemetry) => set(telemetry),

      setQueue: (tracks, startIndex = 0) =>
        set({
          queue: tracks,
          currentIndex: tracks.length ? startIndex : -1,
          playNonce: get().playNonce + 1,
          shuffle: false,
          unshuffledQueue: null,
        }),

      restoreQueue: (tracks, index, positionSeconds) => {
        if (!tracks.length) return
        const currentIndex = Math.min(Math.max(index, 0), tracks.length - 1)
        set({
          queue: tracks,
          currentIndex,
          playNonce: get().playNonce + 1,
          shuffle: false,
          unshuffledQueue: null,
          resumeAt: positionSeconds,
          isPlaying: false,
          currentTime: positionSeconds,
          duration: tracks[currentIndex].durationSeconds,
        })
      },

      playTrackAt: (index) => {
        const { queue } = get()
        if (index < 0 || index >= queue.length) return
        set({ currentIndex: index, playNonce: get().playNonce + 1 })
      },

      playNext: () => {
        const { queue, currentIndex, repeatMode } = get()
        if (queue.length === 0) return
        const next = currentIndex + 1
        if (next < queue.length) {
          set({ currentIndex: next, playNonce: get().playNonce + 1 })
        } else if (repeatMode === "all") {
          set({ currentIndex: 0, playNonce: get().playNonce + 1 })
        }
        // Otherwise: end of queue, nothing to advance to — playback just stops.
      },

      playPrevious: () => {
        const { queue, currentIndex, repeatMode } = get()
        if (queue.length === 0) return
        const prev = currentIndex - 1
        if (prev >= 0) {
          set({ currentIndex: prev, playNonce: get().playNonce + 1 })
        } else if (repeatMode === "all") {
          set({
            currentIndex: queue.length - 1,
            playNonce: get().playNonce + 1,
          })
        }
      },

      // While shuffled, `unshuffledQueue` is the order restored on un-shuffle,
      // so every queue edit below must be mirrored into it — otherwise tracks
      // added while shuffled vanish (and removed ones reappear) on toggle-off.
      addToQueue: (track) =>
        set((state) => ({
          queue: [...state.queue, track],
          unshuffledQueue: state.unshuffledQueue && [
            ...state.unshuffledQueue,
            track,
          ],
        })),

      playNextInQueue: (track) =>
        set((state) => {
          const queue = [...state.queue]
          queue.splice(state.currentIndex + 1, 0, track)
          let unshuffledQueue = state.unshuffledQueue
          if (unshuffledQueue) {
            unshuffledQueue = [...unshuffledQueue]
            const current = state.queue[state.currentIndex]
            const at = current ? unshuffledQueue.indexOf(current) : -1
            unshuffledQueue.splice(at + 1, 0, track)
          }
          return { queue, unshuffledQueue }
        }),

      removeFromQueue: (index) =>
        set((state) => {
          if (index === state.currentIndex) return state // can't remove what's playing
          const removed = state.queue[index]
          const queue = state.queue.filter((_, i) => i !== index)
          const currentIndex =
            index < state.currentIndex
              ? state.currentIndex - 1
              : state.currentIndex
          let unshuffledQueue = state.unshuffledQueue
          if (unshuffledQueue) {
            const at = unshuffledQueue.indexOf(removed)
            if (at !== -1) {
              unshuffledQueue = unshuffledQueue.filter((_, i) => i !== at)
            }
          }
          return { queue, currentIndex, unshuffledQueue }
        }),

      moveInQueue: (index, direction) =>
        set((state) => {
          const target = index + direction
          if (target < 0 || target >= state.queue.length) return state
          // Reordering only makes sense for upcoming tracks — history and
          // the now-playing row stay put so the audio element's current
          // track never silently changes under the user.
          if (index <= state.currentIndex || target <= state.currentIndex)
            return state
          const queue = [...state.queue]
          ;[queue[index], queue[target]] = [queue[target], queue[index]]
          return { queue }
        }),

      toggleShuffle: () =>
        set((state) => {
          if (state.shuffle) {
            if (!state.unshuffledQueue) return { shuffle: false }
            const currentId = state.queue[state.currentIndex]?.id
            const restored = state.unshuffledQueue
            const currentIndex = currentId
              ? restored.findIndex((t) => t.id === currentId)
              : -1
            return {
              shuffle: false,
              queue: restored,
              currentIndex:
                currentIndex === -1 ? state.currentIndex : currentIndex,
              unshuffledQueue: null,
            }
          }
          return {
            shuffle: true,
            unshuffledQueue: state.queue,
            queue: shuffleAfter(state.queue, state.currentIndex),
          }
        }),

      cycleRepeatMode: () =>
        set((state) => ({
          repeatMode:
            state.repeatMode === "off"
              ? "all"
              : state.repeatMode === "all"
                ? "one"
                : "off",
        })),

      setVolume: (volume) =>
        set({ volume: Math.min(100, Math.max(0, volume)), muted: false }),
      toggleMute: () => set((state) => ({ muted: !state.muted })),
    }),
    {
      name: "nd-player",
      partialize: (state) => ({ volume: state.volume, muted: state.muted }),
    },
  ),
)

export function useCurrentTrack(): QueuedTrack | null {
  return usePlayerStore((s) => s.queue[s.currentIndex] ?? null)
}
