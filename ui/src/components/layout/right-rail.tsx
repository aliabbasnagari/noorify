import { Captions, Info, ListMusic } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'
import { AboutArtist } from '@/components/player/about-artist'
import { LyricsPanel } from '@/components/player/lyrics-panel'
import { NextInQueue } from '@/components/player/next-in-queue'
import { QueueList } from '@/components/player/queue-list'
import { useCurrentTrack } from '@/stores/player-store'
import { useUiStore, type RightPanelTab } from '@/stores/ui-store'

const TABS: { id: RightPanelTab; icon: typeof Info }[] = [
  { id: 'now-playing', icon: Info },
  { id: 'queue', icon: ListMusic },
  { id: 'lyrics', icon: Captions },
]

/** The desktop (lg+) third column: Spotify-style dynamic right rail showing
 * context for what's currently playing — artist info, the queue (in place of
 * the old popup), or lyrics, depending on the active tab. */
export function RightRail() {
  const { t } = useTranslation()
  const currentTrack = useCurrentTrack()
  const tab = useUiStore((s) => s.rightPanelTab)
  const setTab = useUiStore((s) => s.setRightPanelTab)

  const tabLabel = (id: RightPanelTab) =>
    id === 'now-playing'
      ? t('player.queue.nowPlaying')
      : id === 'queue'
        ? t('player.queue.title')
        : t('nowPlaying.lyrics')

  return (
    <aside
      data-slot="right-rail"
      className="flex h-full w-80 flex-col gap-3 overflow-hidden rounded-xl bg-card p-3"
    >
      <div className="flex shrink-0 items-center gap-1 rounded-lg bg-muted/50 p-1">
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            aria-label={tabLabel(id)}
            title={tabLabel(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
              tab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            <span className="truncate">{tabLabel(id)}</span>
          </button>
        ))}
      </div>

      <div className="scrollbar-fade flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {!currentTrack ? (
          <p className="p-2 text-sm text-muted-foreground">
            {t('nowPlaying.nothingPlaying')}
          </p>
        ) : tab === 'lyrics' ? (
          currentTrack.isRadio ? (
            <p className="p-2 text-sm text-muted-foreground">
              {t('nowPlaying.lyricsNotAvailableForRadio')}
            </p>
          ) : (
            <LyricsPanel songId={currentTrack.id} />
          )
        ) : tab === 'queue' ? (
          <QueueList />
        ) : (
          <>
            <AboutArtist track={currentTrack} />
            <NextInQueue
              compact
              action={
                <button
                  type="button"
                  onClick={() => setTab('queue')}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                >
                  {t('nowPlaying.openQueue')}
                </button>
              }
            />
          </>
        )}
      </div>
    </aside>
  )
}
