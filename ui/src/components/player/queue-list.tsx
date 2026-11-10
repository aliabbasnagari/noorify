import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import { Infinity as InfinityIcon, Save, Shuffle, X } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { QueueRow } from '@/components/player/queue-row'
import { SaveQueueDialog } from '@/components/player/save-queue-dialog'
import { SortableQueueRow } from '@/components/player/sortable-queue-row'
import { queueItemIds } from '@/lib/player/queue-ids'
import { usePlayerStore } from '@/stores/player-store'
import { useSettingsStore } from '@/stores/settings-store'

/** Rows only ever travel up and down the list. */
const lockToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})

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
  const shuffle = usePlayerStore((s) => s.shuffle)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const clearQueueExceptCurrent = usePlayerStore(
    (s) => s.clearQueueExceptCurrent,
  )
  const autoplay = useSettingsStore((s) => s.autoplay)
  const setAutoplay = useSettingsStore((s) => s.setAutoplay)
  const [saveOpen, setSaveOpen] = useState(false)

  const ids = useMemo(() => queueItemIds(queue), [queue])
  // Only upcoming rows can be reordered (the store keeps history and the
  // current track fixed), so only they take part in the sortable list.
  const upcomingIds = useMemo(
    () => ids.slice(currentIndex + 1),
    [ids, currentIndex],
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Keeps reordering usable without a pointer now that the move up/down
    // buttons are gone: focus the handle, Space to lift, arrows, Space to drop.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from !== -1 && to !== -1) moveInQueue(from, to)
  }

  // Keep the current track in view: on mount, and as playback advances.
  const scrollToCurrent = useCallback(
    (el: HTMLElement | null) => el?.scrollIntoView?.({ block: 'center' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per track
    [currentIndex],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {queue.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setSaveOpen(true)}
          >
            <Save className="size-3.5" />
            {t('player.queue.saveAsPlaylist')}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            // Nothing to clear when only the playing track is left.
            disabled={queue.length < 2}
            aria-label={t('player.queue.clear')}
            title={t('player.queue.clearHelp')}
            onClick={clearQueueExceptCurrent}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={queue.length < 2}
          aria-pressed={shuffle}
          className={cn(shuffle && 'text-primary')}
          onClick={toggleShuffle}
        >
          <Shuffle className="size-3.5" />
          {t('player.shuffle')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={autoplay}
          title={t('player.queue.autoplayHelp')}
          className={cn(autoplay && 'text-primary')}
          onClick={() => setAutoplay(!autoplay)}
        >
          <InfinityIcon className="size-3.5" />
          {t('player.queue.autoplay')}
        </Button>
      </div>
      <div className="scrollbar-fade flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('player.queue.empty')}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[lockToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={upcomingIds}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1">
                {queue.map((track, index) => {
                  const id = ids[index]
                  if (index > currentIndex) {
                    return (
                      <SortableQueueRow
                        key={id}
                        id={id}
                        track={track}
                        onPlay={() => playTrackAt(index)}
                        onRemove={() => removeFromQueue(index)}
                      />
                    )
                  }
                  const isCurrent = index === currentIndex
                  return (
                    <li key={id} ref={isCurrent ? scrollToCurrent : undefined}>
                      <QueueRow
                        track={track}
                        active={isCurrent}
                        playing={isPlaying}
                        played={!isCurrent}
                        onPlay={() => playTrackAt(index)}
                        onRemove={
                          isCurrent ? undefined : () => removeFromQueue(index)
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
      {saveOpen && (
        <SaveQueueDialog open={saveOpen} onOpenChange={setSaveOpen} />
      )}
    </div>
  )
}
