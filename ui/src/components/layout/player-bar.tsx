import { Link } from '@tanstack/react-router'
import { Maximize2, Pause, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { playerButtonFx } from '@/components/player/button-fx'
import { ArtistLinks } from '@/components/library/artist-links'
import { QueuePanel } from '@/components/player/queue-panel'
import { VolumeControl } from '@/components/player/volume-control'
import { SeekBar } from '@/components/player/seek-bar'
import { TransportControls } from '@/components/player/transport-controls'
import { getCoverArtUrl } from '@/lib/api/subsonic'
import { audioEngine } from '@/lib/player/audio-engine'
import { cn } from 'cn'
import {
  useCurrentTrack,
  usePlayerStore,
  type QueuedTrack,
} from '@/stores/player-store'

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
    'shrink-0 rounded-full object-cover animate-[spin_12s_linear_infinite] motion-reduce:animate-none',
    className,
  )
  const style = { animationPlayState: spinning ? 'running' : 'paused' } as const
  if (!track) {
    return <div className={cn(spin, 'bg-muted')} style={style} aria-hidden />
  }
  return (
    <img
      key={track.id}
      src={getCoverArtUrl(track.id, track.isRadio ? 'ra' : 'mf', size)}
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
                {currentTrack?.title ?? t('player.bar.nothingPlaying')}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack?.artist ?? '—'}
              </p>
            </div>
          </Link>
          <Button
            size="icon"
            className={cn('shrink-0 rounded-full', playerButtonFx)}
            disabled={!currentTrack}
            aria-label={isPlaying ? t('player.pause') : t('player.play')}
            onClick={(e) => {
              e.preventDefault()
              audioEngine.togglePlayPause()
            }}
          >
            {isPlaying ? (
              <Pause className="fill-background text-background" />
            ) : (
              <Play className="fill-background text-background" />
            )}
          </Button>
        </div>
      </div>

      {/* Full desktop player bar. */}
      <div
        data-slot="player-bar-desktop"
        className="hidden h-20 grid-cols-3 items-center gap-4 px-4 md:grid"
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
              {currentTrack?.title ?? t('player.bar.nothingPlaying')}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentTrack ? (
                <ArtistLinks
                  artist={currentTrack.artist}
                  artistId={currentTrack.artistId}
                  artists={currentTrack.artists}
                  className="hover:text-foreground hover:underline"
                />
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <TransportControls />
          <SeekBar className="w-full max-w-xl" />
        </div>

        <div className="flex items-center justify-end gap-2">
          {currentTrack && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t('player.bar.expandNowPlaying')}
              className={playerButtonFx}
              render={<Link to="/now-playing" />}
            >
              <Maximize2 />
            </Button>
          )}
          <QueuePanel />
          <VolumeControl />
        </div>
      </div>
    </footer>
  )
}
