import { useCallback, useState, type ReactElement } from 'react'
import { ChevronDown, ChevronUp, ListMusic, Save, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PlayingBars } from '@/components/library/playing-bars'
import { SaveQueueDialog } from '@/components/player/save-queue-dialog'
import { playerButtonFx } from '@/components/player/button-fx'
import { usePlayerStore, type QueuedTrack } from '@/stores/player-store'
import { formatDuration } from '@/lib/format'

export function QueuePanel({ trigger }: { trigger?: ReactElement }) {
  const { t } = useTranslation()
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playTrackAt = usePlayerStore((s) => s.playTrackAt)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const moveInQueue = usePlayerStore((s) => s.moveInQueue)
  const [open, setOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)

  // Keep the current track in view: on open, and as playback advances.
  const scrollToCurrent = useCallback(
    (el: HTMLElement | null) => el?.scrollIntoView?.({ block: 'center' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per track
    [currentIndex],
  )

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            trigger ?? (
              <Button
                variant="ghost"
                size="icon-lg"
                className={playerButtonFx}
                aria-label={t('player.queue.title')}
              />
            )
          }
        >
          {trigger ? t('nowPlaying.openQueue') : <ListMusic />}
        </SheetTrigger>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>
              {t('player.queue.title')}
              {queue.length > 0 && (
                <span className="ml-2 font-normal text-muted-foreground">
                  {queue.length}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
          {queue.length > 0 && (
            <div className="px-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveOpen(true)}
              >
                <Save className="size-3.5" />
                {t('player.queue.saveAsPlaylist')}
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('player.queue.empty')}
              </p>
            ) : (
              <ul className="space-y-1">
                {queue.map((track, index) => {
                  const isCurrent = index === currentIndex
                  const isUpcoming = index > currentIndex
                  return (
                    <li
                      key={`${track.id}-${index}`}
                      ref={isCurrent ? scrollToCurrent : undefined}
                    >
                      <QueueRow
                        track={track}
                        active={isCurrent}
                        playing={isPlaying}
                        played={index < currentIndex}
                        onPlay={() => playTrackAt(index)}
                        onRemove={
                          isCurrent ? undefined : () => removeFromQueue(index)
                        }
                        // Only upcoming entries can be reordered (the store
                        // keeps history and the current track fixed).
                        onMoveUp={
                          isUpcoming && index - 1 > currentIndex
                            ? () => moveInQueue(index, -1)
                            : undefined
                        }
                        onMoveDown={
                          isUpcoming && index < queue.length - 1
                            ? () => moveInQueue(index, 1)
                            : undefined
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {saveOpen && (
        <SaveQueueDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          onSaved={() => setOpen(false)}
        />
      )}
    </>
  )
}

export function QueueRow({
  track,
  active,
  playing = false,
  played = false,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  track: QueuedTrack
  active?: boolean
  /** Whether audio is currently playing (animates the active row's bars). */
  playing?: boolean
  /** Already-played entry — shown dimmed, but still clickable to replay. */
  played?: boolean
  onPlay?: () => void
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
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
        <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
      </button>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatDuration(track.durationSeconds)}
      </span>
      {onMoveUp && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onMoveUp}
          aria-label={t('player.queue.moveUp')}
        >
          <ChevronUp className="size-3.5" />
        </Button>
      )}
      {onMoveDown && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onMoveDown}
          aria-label={t('player.queue.moveDown')}
        >
          <ChevronDown className="size-3.5" />
        </Button>
      )}
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
