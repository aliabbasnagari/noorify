import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelCard } from '@/components/player/panel-card'
import { getCoverArtUrl } from '@/lib/api/subsonic'
import { usePlayerStore } from '@/stores/player-store'

const NEXT_IN_QUEUE_COUNT = 4

export function NextInQueue({
  action,
  compact = false,
}: {
  action?: ReactNode
  compact?: boolean
}) {
  const { t } = useTranslation()
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playTrackAt = usePlayerStore((s) => s.playTrackAt)
  const upcoming = queue.slice(
    currentIndex + 1,
    currentIndex + 1 + NEXT_IN_QUEUE_COUNT,
  )

  return (
    <PanelCard
      title={t('nowPlaying.nextInQueue')}
      action={action}
      compact={compact}
    >
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('nowPlaying.queueIsEmpty')}
        </p>
      ) : (
        <ul className="space-y-1">
          {upcoming.map((track, i) => (
            <li key={`${track.id}-${i}`}>
              <button
                type="button"
                onClick={() => playTrackAt(currentIndex + 1 + i)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
              >
                <img
                  src={getCoverArtUrl(
                    track.id,
                    track.isRadio ? 'ra' : 'mf',
                    96,
                  )}
                  alt=""
                  draggable={false}
                  className="size-12 shrink-0 rounded object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {track.title}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {track.artist}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  )
}
