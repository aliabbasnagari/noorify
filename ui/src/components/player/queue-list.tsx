import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueueRow } from '@/components/player/queue-row'
import { SaveQueueDialog } from '@/components/player/save-queue-dialog'
import { usePlayerStore } from '@/stores/player-store'

/** The queue's track list + "save as playlist" action, shared by the mobile
 * queue Sheet (queue-panel.tsx) and the desktop right rail's Queue tab. */
export function QueueList() {
  const { t } = useTranslation()
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const playTrackAt = usePlayerStore((s) => s.playTrackAt)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const moveInQueue = usePlayerStore((s) => s.moveInQueue)
  const [saveOpen, setSaveOpen] = useState(false)

  // Keep the current track in view: on mount, and as playback advances.
  const scrollToCurrent = useCallback(
    (el: HTMLElement | null) => el?.scrollIntoView?.({ block: 'center' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per track
    [currentIndex],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {queue.length > 0 && (
        <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
          <Save className="size-3.5" />
          {t('player.queue.saveAsPlaylist')}
        </Button>
      )}
      <div className="scrollbar-fade flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
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
      {saveOpen && (
        <SaveQueueDialog open={saveOpen} onOpenChange={setSaveOpen} />
      )}
    </div>
  )
}
