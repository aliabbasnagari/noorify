import { ChevronDown, ChevronUp, ListMusic, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { playerButtonFx } from "@/components/player/button-fx"
import { usePlayerStore, type QueuedTrack } from "@/stores/player-store"
import { formatDuration } from "@/lib/format"

export function QueuePanel() {
  const { t } = useTranslation()
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playTrackAt = usePlayerStore((s) => s.playTrackAt)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const moveInQueue = usePlayerStore((s) => s.moveInQueue)

  const nowPlaying = currentIndex >= 0 ? queue[currentIndex] : null
  const upcoming = queue.slice(currentIndex + 1)

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className={playerButtonFx}
            aria-label={t("player.queue.title")}
          />
        }
      >
        <ListMusic />
      </SheetTrigger>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>{t("player.queue.title")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
          {nowPlaying && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                {t("player.queue.nowPlaying")}
              </h3>
              <QueueRow track={nowPlaying} active />
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
              {t("player.queue.nextUp")}
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("player.queue.empty")}
              </p>
            ) : (
              <ul className="space-y-1">
                {upcoming.map((track, i) => {
                  const index = currentIndex + 1 + i
                  return (
                    <li key={`${track.id}-${index}`}>
                      <QueueRow
                        track={track}
                        onPlay={() => playTrackAt(index)}
                        onRemove={() => removeFromQueue(index)}
                        onMoveUp={
                          i > 0 ? () => moveInQueue(index, -1) : undefined
                        }
                        onMoveDown={
                          i < upcoming.length - 1
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
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function QueueRow({
  track,
  active,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  track: QueuedTrack
  active?: boolean
  onPlay?: () => void
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5",
        active && "bg-accent",
      )}
    >
      <button
        type="button"
        className="min-w-0 flex-1 text-left disabled:cursor-default"
        onClick={onPlay}
        disabled={!onPlay}
      >
        <p className="truncate text-sm font-medium">{track.title}</p>
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
          aria-label={t("player.queue.moveUp")}
        >
          <ChevronUp className="size-3.5" />
        </Button>
      )}
      {onMoveDown && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onMoveDown}
          aria-label={t("player.queue.moveDown")}
        >
          <ChevronDown className="size-3.5" />
        </Button>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          aria-label={t("player.queue.remove")}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
