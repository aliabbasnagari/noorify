import { toast } from "sonner"
import i18n from "@/i18n"
import { getCoverArtUrl, reportPlayback, streamUrl } from "@/lib/api/subsonic"
import { usePlayerStore, type QueuedTrack } from "@/stores/player-store"

// Scrobble once a track crosses whichever comes first, matching the
// Subsonic/last.fm convention old-ui followed (server/subsonic/scrobble.go
// callers): half the track, or 4 minutes.
const SCROBBLE_AT_SECONDS = 240

function safeReport(songId: string, submission: boolean) {
  Promise.resolve()
    .then(() => reportPlayback(songId, submission))
    .catch(() => {})
}

/**
 * Owns the single <audio> element for the whole app. A module-level
 * singleton rather than a hook: the element must survive route navigation
 * (the player bar is persistent), so its lifecycle can't be tied to any one
 * component's mount/unmount.
 *
 * Data flows one way: store queue/currentIndex/volume/muted are the source
 * of truth this engine reacts to; telemetry (isPlaying/currentTime/duration/
 * isBuffering) flows the other way, from the real element's native events
 * back into the store, via setTelemetry. UI actions never set telemetry
 * directly, so they can't drift from what the element is actually doing
 * (e.g. autoplay being blocked before a user gesture).
 */
class AudioEngine {
  private audio = new Audio()
  private lastLoadedTrackId: string | null = null
  private scrobbledTrackId: string | null = null
  private consecutiveFailures = 0

  constructor() {
    this.audio.preload = "metadata"
    this.bindAudioEvents()
    this.subscribeToStore()
    this.setupMediaSession()
  }

  private bindAudioEvents() {
    const { setTelemetry } = usePlayerStore.getState()

    this.audio.addEventListener("play", () => setTelemetry({ isPlaying: true }))
    this.audio.addEventListener("pause", () =>
      setTelemetry({ isPlaying: false }),
    )
    this.audio.addEventListener("waiting", () =>
      setTelemetry({ isBuffering: true }),
    )
    this.audio.addEventListener("canplay", () =>
      setTelemetry({ isBuffering: false }),
    )
    this.audio.addEventListener("playing", () => {
      this.consecutiveFailures = 0
      setTelemetry({ isBuffering: false })
    })
    this.audio.addEventListener("error", this.handleError)
    this.audio.addEventListener("loadedmetadata", () =>
      setTelemetry({ duration: this.audio.duration || 0 }),
    )
    this.audio.addEventListener("timeupdate", this.handleTimeUpdate)
    this.audio.addEventListener("ended", this.handleEnded)
  }

  private subscribeToStore() {
    this.applyVolume(usePlayerStore.getState())
    this.loadCurrentTrack(usePlayerStore.getState())

    usePlayerStore.subscribe((state, prevState) => {
      if (
        state.volume !== prevState.volume ||
        state.muted !== prevState.muted
      ) {
        this.applyVolume(state)
      }
      const track = state.queue[state.currentIndex] ?? null
      const prevTrack = prevState.queue[prevState.currentIndex] ?? null
      // playNonce changes on every explicit "play this now" action, which
      // is what lets the same track id restart (repeat-all on a single
      // track, the same song queued twice in a row, re-clicking Play).
      if (
        track?.id !== prevTrack?.id ||
        state.playNonce !== prevState.playNonce
      ) {
        this.loadCurrentTrack(state, state.playNonce !== prevState.playNonce)
      }
    })
  }

  private applyVolume(state: { volume: number; muted: boolean }) {
    this.audio.volume = state.muted ? 0 : state.volume / 100
  }

  private loadCurrentTrack(
    state: { queue: QueuedTrack[]; currentIndex: number },
    force = false,
  ) {
    const track = state.queue[state.currentIndex] ?? null
    if (!force && track?.id === this.lastLoadedTrackId) return
    this.lastLoadedTrackId = track?.id ?? null
    this.scrobbledTrackId = null

    if (!track) {
      this.audio.pause()
      this.audio.removeAttribute("src")
      return
    }

    this.audio.src = track.isRadio ? (track.streamUrl ?? "") : streamUrl(track.id)
    void this.audio.play().catch(() => {
      // Most likely the browser blocking autoplay before a user gesture —
      // the native `pause` event already fired setTelemetry({isPlaying:false}),
      // so the UI reflects it correctly; nothing else to do here.
    })
    // Radio stations aren't library tracks — there's nothing to scrobble,
    // and reporting one to Subsonic's now-playing/scrobble endpoints would
    // just fail server-side on an id that isn't a media file.
    if (!track.isRadio) {
      // Scrobbling is best-effort: a failure must never interrupt playback.
      safeReport(track.id, false)
    }
    this.updateMediaSessionMetadata(track)
  }

  private handleTimeUpdate = () => {
    usePlayerStore
      .getState()
      .setTelemetry({ currentTime: this.audio.currentTime })

    const track =
      usePlayerStore.getState().queue[usePlayerStore.getState().currentIndex]
    if (!track || track.isRadio || this.scrobbledTrackId === track.id) return
    const halfway =
      this.audio.duration > 0 &&
      this.audio.currentTime > this.audio.duration / 2
    if (halfway || this.audio.currentTime > SCROBBLE_AT_SECONDS) {
      this.scrobbledTrackId = track.id
      safeReport(track.id, true)
    }
  }

  /**
   * A stream that 404s, fails to decode or drops mid-track fires `error`;
   * without handling it the UI sits in "buffering" forever. Tell the user and
   * move on to the next track — but give up once every track in the queue has
   * failed back-to-back (e.g. the server is down) so repeat-all can't spin.
   */
  private handleError = () => {
    // Clearing the source (empty queue) also raises an error on some browsers.
    if (!this.audio.getAttribute("src")) return
    const state = usePlayerStore.getState()
    const track = state.queue[state.currentIndex]
    state.setTelemetry({ isPlaying: false, isBuffering: false })
    if (track) {
      toast.error(i18n.t("errors.trackFailed", { title: track.title }), {
        id: "track-error",
      })
    }
    this.consecutiveFailures++
    const hasNext =
      state.currentIndex + 1 < state.queue.length || state.repeatMode === "all"
    if (hasNext && this.consecutiveFailures < state.queue.length) {
      state.playNext()
    }
  }

  private handleEnded = () => {
    if (usePlayerStore.getState().repeatMode === "one") {
      this.audio.currentTime = 0
      void this.audio.play()
      return
    }
    usePlayerStore.getState().playNext()
  }

  togglePlayPause() {
    if (!this.lastLoadedTrackId) return
    if (this.audio.paused) void this.audio.play()
    else this.audio.pause()
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds
  }

  /** Restarts the current track if more than 3s in, matching the common
   * "previous" convention (Spotify et al.) — otherwise skips back. */
  previous() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0
    } else {
      usePlayerStore.getState().playPrevious()
    }
  }

  next() {
    usePlayerStore.getState().playNext()
  }

  private setupMediaSession() {
    if (!("mediaSession" in navigator)) return
    navigator.mediaSession.setActionHandler("play", () =>
      this.togglePlayPause(),
    )
    navigator.mediaSession.setActionHandler("pause", () =>
      this.togglePlayPause(),
    )
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      this.previous(),
    )
    navigator.mediaSession.setActionHandler("nexttrack", () => this.next())
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) this.seek(details.seekTime)
    })
  }

  private updateMediaSessionMetadata(track: QueuedTrack) {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined")
      return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.albumTitle,
      artwork: track.isRadio
        ? []
        : [{ src: getCoverArtUrl(track.id, "mf", 512) }],
    })
  }
}

export const audioEngine = new AudioEngine()
