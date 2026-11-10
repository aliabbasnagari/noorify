import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'
import { QueueRow } from '@/components/player/queue-row'
import type { QueuedTrack } from '@/stores/player-store'

/** An upcoming queue entry that can be dragged to a new position. Played
 * and now-playing rows are plain QueueRows — they never move. */
export function SortableQueueRow({
  id,
  track,
  onPlay,
  onRemove,
}: {
  id: string
  track: QueuedTrack
  onPlay: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative rounded-md',
        isDragging && 'z-10 bg-card opacity-80 shadow-lg',
      )}
    >
      <QueueRow
        track={track}
        onPlay={onPlay}
        onRemove={onRemove}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label={t('player.queue.reorder')}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </li>
  )
}
