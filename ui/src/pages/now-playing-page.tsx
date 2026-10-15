import type { ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'
import { ArtistLinks } from '@/components/library/artist-links'
import { Button } from '@/components/ui/button'
import { ArtHeroBackground } from '@/components/library/art-hero-background'
import { LyricsPanel } from '@/components/player/lyrics-panel'
import { QueuePanel } from '@/components/player/queue-panel'
import { SeekBar } from '@/components/player/seek-bar'
import { TransportControls } from '@/components/player/transport-controls'
import { VolumeControl } from '@/components/player/volume-control'
import { getOne } from '@/lib/api/http'
import { getCoverArtUrl } from '@/lib/api/subsonic'
import type { Artist } from '@/lib/api/types'
import {
  useCurrentTrack,
  usePlayerStore,
  type QueuedTrack,
} from '@/stores/player-store'

const NEXT_IN_QUEUE_COUNT = 4

function Card({
  title,
  action,
  compact = false,
  children,
}: {
  title: string
  action?: ReactNode
  compact?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-xl bg-card/80 shadow-sm backdrop-blur',
        compact ? 'p-4' : 'p-6',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-4',
          compact ? 'mb-3' : 'mb-4',
        )}
      >
        <h2 className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function AboutArtist({ track }: { track: QueuedTrack }) {
  const { t } = useTranslation()
  const artistId = track.artistId ?? track.artists?.[0]?.id
  const { data: artist } = useQuery({
    queryKey: ['artist', 'detail', artistId],
    queryFn: () => getOne<Artist>('artist', artistId!),
    enabled: !!artistId,
  })
  if (!artistId || track.isRadio) return null

  const biography = artist?.biography?.replace(/<[^>]*>/g, '').trim()
  return (
    <Card title={t('nowPlaying.aboutArtist')} compact>
      <div className="flex items-start gap-4">
        <Link to="/artist/$artistId" params={{ artistId }} className="shrink-0">
          <img
            src={getCoverArtUrl(artistId, 'ar', 160)}
            alt=""
            draggable={false}
            className="size-16 rounded-full object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/artist/$artistId"
            params={{ artistId }}
            className="block truncate font-bold hover:underline"
          >
            {artist?.name ?? track.artist}
          </Link>
          <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">
            {biography || t('nowPlaying.noBiography')}
          </p>
        </div>
      </div>
    </Card>
  )
}

function NextInQueue() {
  const { t } = useTranslation()
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playTrackAt = usePlayerStore((s) => s.playTrackAt)
  const upcoming = queue.slice(
    currentIndex + 1,
    currentIndex + 1 + NEXT_IN_QUEUE_COUNT,
  )

  return (
    <Card
      title={t('nowPlaying.nextInQueue')}
      action={
        <QueuePanel
          trigger={
            <button
              type="button"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
            />
          }
        />
      }
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
    </Card>
  )
}

export default function NowPlayingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const currentTrack = useCurrentTrack()

  const coverUrl = currentTrack
    ? getCoverArtUrl(currentTrack.id, currentTrack.isRadio ? 'ra' : 'mf', 800)
    : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar: stays put; only the middle section scrolls. */}
      <header className="flex shrink-0 items-center justify-between gap-4 px-6 py-4">
        <p className="truncate text-lg font-bold">
          {currentTrack?.title ?? ''}
        </p>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t('nowPlaying.closeNowPlaying')}
          onClick={() => router.history.back()}
        >
          <ChevronDown />
        </Button>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <ArtHeroBackground imageUrl={coverUrl} />

        {!currentTrack ? (
          <p className="py-16 text-center text-muted-foreground">
            {t('nowPlaying.nothingPlaying')}
          </p>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-8 px-6 pt-4 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
            {/* Left: cover art + title, staying in view while the cards scroll. */}
            <div className="flex flex-col items-center gap-5 md:sticky md:top-4">
              <img
                src={coverUrl!}
                alt=""
                draggable={false}
                className="aspect-square w-full max-w-[min(30rem,60vh)] rounded-xl object-cover shadow-2xl"
              />
              <div className="w-full max-w-[min(30rem,60vh)] md:text-left">
                <h1 className="truncate text-3xl font-bold text-balance max-md:text-center">
                  {currentTrack.title}
                </h1>
                <p className="truncate text-lg text-muted-foreground max-md:text-center">
                  <ArtistLinks
                    artist={currentTrack.artist}
                    artistId={currentTrack.artistId}
                    artists={currentTrack.artists}
                    className="hover:text-foreground hover:underline"
                  />
                </p>
              </div>
            </div>

            {/* Right: stacked cards. */}
            <div className="flex flex-col gap-6">
              <AboutArtist track={currentTrack} />
              <Card title={t('nowPlaying.lyrics')}>
                {currentTrack.isRadio ? (
                  <p className="text-sm text-muted-foreground">
                    {t('nowPlaying.lyricsNotAvailableForRadio')}
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <LyricsPanel songId={currentTrack.id} />
                  </div>
                )}
              </Card>
              <NextInQueue />
            </div>
          </div>
        )}
      </div>

      {/* Always-visible controls, like the main player bar. */}
      <footer className="shrink-0 border-t border-border bg-background px-4 py-3">
        <div className="mx-auto grid max-w-[100rem] items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {currentTrack && (
              <img
                src={getCoverArtUrl(
                  currentTrack.id,
                  currentTrack.isRadio ? 'ra' : 'mf',
                  128,
                )}
                alt=""
                draggable={false}
                className="size-14 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {currentTrack?.title ?? t('player.bar.nothingPlaying')}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack && (
                  <ArtistLinks
                    artist={currentTrack.artist}
                    artistId={currentTrack.artistId}
                    artists={currentTrack.artists}
                    className="hover:text-foreground hover:underline"
                  />
                )}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col items-center gap-1.5 md:w-[36rem] md:max-w-[40vw]">
            <TransportControls />
            <SeekBar className="w-full" />
          </div>
          <div className="hidden items-center justify-end gap-2 md:flex">
            <QueuePanel />
            <VolumeControl />
          </div>
        </div>
      </footer>
    </div>
  )
}
