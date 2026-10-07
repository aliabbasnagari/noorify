import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { SongRow } from "@/components/library/song-row"
import type { PlaylistTrack } from "@/lib/api/types"

export function SortableTrackRow({
  track,
  index,
  active,
  editable,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onRemove,
}: {
  track: PlaylistTrack
  index: number
  active: boolean
  editable: boolean
  onPlay: () => void
  onPlayNext: () => void
  onAddToQueue: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: track.id,
    disabled: !editable,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-1", isDragging && "z-10 opacity-70")}
    >
      {editable && (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label={t("library.components.sortableTrackRow.dragAria")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <SongRow
          // `track.id` is the playlist-row id; every SongRow action (rate,
          // star, info, download, share, add to playlist) needs the song's
          // own id — see PlaylistTrack's doc comment in lib/api/types.ts.
          song={{ ...track, id: track.mediaFileId }}
          index={index}
          active={active}
          onPlay={onPlay}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
        />
      </div>
      {editable && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t("library.components.sortableTrackRow.removeAria")}
          onClick={onRemove}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
