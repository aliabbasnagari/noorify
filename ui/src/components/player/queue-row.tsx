import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { PlayingBars } from '@/components/library/playing-bars'
import { formatDuration } from '@/lib/format'
import type { QueuedTrack } from '@/stores/player-store'

export function QueueRow({
  track,
  active,
  playing = false,
  played = false,
  onPlay,
  onRemove,
  dragHandle,
}: {
  track: QueuedTrack
  active?: boolean
  /** Whether audio is currently playing (animates the active row's bars). */
  playing?: boolean
  /** Already-played entry — shown dimmed, but still clickable to replay. */
  played?: boolean
  onPlay?: () => void
  onRemove?: () => void
  /** Grab handle for reordering — only upcoming rows get one. */
  dragHandle?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5',
        active && 'bg-accent',
        played && 'opacity-60',
      )}
    >
      {dragHandle}
      {active && <PlayingBars playing={playing} className="shrink-0" />}
      <button
        type="button"
        className="min-w-0 flex-1 text-left disabled:cursor-default"
        onClick={onPlay}
        disabled={!onPlay}
      >
        <p
          className={cn(
            'truncate text-sm font-medium',
            active && 'text-primary',
          )}
        >
          {track.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artist}
          {track.autoplay && ` · ${t('player.queue.autoplayBadge')}`}
        </p>
      </button>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatDuration(track.durationSeconds)}
      </span>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label={t('player.queue.remove')}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
