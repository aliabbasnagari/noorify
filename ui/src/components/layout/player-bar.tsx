import { Link } from "@tanstack/react-router"
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { QueuePanel } from "@/components/player/queue-panel"
import { SeekBar } from "@/components/player/seek-bar"
import { TransportControls } from "@/components/player/transport-controls"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import { audioEngine } from "@/lib/player/audio-engine"
import { cn } from "cn"
import {
  useCurrentTrack,
  usePlayerStore,
  type QueuedTrack,
} from "@/stores/player-store"

/**
 * Round, vinyl-style cover that spins while playing and freezes at its current
 * angle on pause/stop (animation-play-state, so it resumes rather than
 * snapping back). Keyed by track so each new track starts upright.
 */
function SpinningCover({
  track,
  size,
  spinning,
  className,
}: {
  track: QueuedTrack | null
  size: number
  spinning: boolean
  className: string
}) {
  const spin = cn(
    "shrink-0 rounded-full object-cover animate-[spin_12s_linear_infinite] motion-reduce:animate-none",
    className,
  )
  const style = { animationPlayState: spinning ? "running" : "paused" } as const
  if (!track) {
    return <div className={cn(spin, "bg-muted")} style={style} aria-hidden />
  }
  return (
    <img
      key={track.id}
      src={getCoverArtUrl(track.id, track.isRadio ? "ra" : "mf", size)}
      alt=""
      draggable={false}
      className={spin}
      style={style}
    />
  )
}

export function PlayerBar() {
  const { t } = useTranslation()
  const currentTrack = useCurrentTrack()
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <footer
      data-slot="player-bar"
      className="shrink-0 border-t border-border bg-background"
    >
      {/* Compact tap-to-expand mini player — there's no room at phone width
          for the full transport/seek/volume layout below, and Spotify's own
          mobile web player is exactly this shape: art+title (tap to open
          full Now Playing), a play/pause button, and a thin progress line. */}
      <div data-slot="player-bar-mobile" className="md:hidden">
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex h-16 items-center gap-3 px-3">
          <Link
            to="/now-playing"
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <SpinningCover
              track={currentTrack}
              size={96}
              spinning={isPlaying}
              className="size-10"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {currentTrack?.title ?? t("player.bar.nothingPlaying")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack?.artist ?? "—"}
              </p>
            </div>
          </Link>
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            disabled={!currentTrack}
            aria-label={isPlaying ? t("player.pause") : t("player.play")}
            onClick={(e) => {
              e.preventDefault()
              audioEngine.togglePlayPause()
            }}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
        </div>
      </div>

      {/* Full desktop player bar. */}
      <div
        data-slot="player-bar-desktop"
        className="hidden h-[90px] grid-cols-3 items-center gap-4 px-4 md:grid"
      >
        <div className="flex min-w-0 items-center gap-3">
          <SpinningCover
            track={currentTrack}
            size={128}
            spinning={isPlaying}
            className="size-14"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {currentTrack?.title ?? t("player.bar.nothingPlaying")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentTrack?.artist ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <TransportControls />
          <SeekBar className="w-full max-w-md" />
        </div>

        <div className="flex items-center justify-end gap-2">
          {currentTrack && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("player.bar.expandNowPlaying")}
              render={<Link to="/now-playing" />}
            >
              <Maximize2 />
            </Button>
          )}
          <QueuePanel />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={muted ? t("player.bar.unmute") : t("player.bar.mute")}
            onClick={toggleMute}
          >
            {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>
          <div className="w-16">
            <Slider
              value={[muted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={(value) =>
                setVolume(Array.isArray(value) ? value[0] : value)
              }
              aria-label={t("player.bar.volume")}
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
