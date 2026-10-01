import { useRouter } from "@tanstack/react-router"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ArtHeroBackground } from "@/components/library/art-hero-background"
import { LyricsPanel } from "@/components/player/lyrics-panel"
import { QueueRow } from "@/components/player/queue-panel"
import { SeekBar } from "@/components/player/seek-bar"
import { TransportControls } from "@/components/player/transport-controls"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import { useCurrentTrack, usePlayerStore } from "@/stores/player-store"

export default function NowPlayingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const currentTrack = useCurrentTrack()
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const queue = usePlayerStore((s) => s.queue)
  const playTrackAt = usePlayerStore((s) => s.playTrackAt)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const moveInQueue = usePlayerStore((s) => s.moveInQueue)

  const coverUrl = currentTrack
    ? getCoverArtUrl(currentTrack.id, currentTrack.isRadio ? "ra" : "mf", 600)
    : null
  const upcoming = queue.slice(currentIndex + 1)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <ArtHeroBackground imageUrl={coverUrl} />

      <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-8 px-6 py-6">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("nowPlaying.closeNowPlaying")}
            onClick={() => router.history.back()}
          >
            <X />
          </Button>
        </div>

        {!currentTrack ? (
          <p className="py-16 text-center text-muted-foreground">
            {t("nowPlaying.nothingPlaying")}
          </p>
        ) : (
          <div className="grid flex-1 gap-10 md:grid-cols-2">
            <div className="flex flex-col items-center gap-6">
              <img
                src={coverUrl!}
                alt=""
                draggable={false}
                className="aspect-square w-full max-w-md rounded-lg object-cover shadow-2xl"
              />
              <div className="w-full max-w-md text-center">
                <h1 className="truncate text-2xl font-bold text-balance">
                  {currentTrack.title}
                </h1>
                <p className="truncate text-muted-foreground">
                  {currentTrack.artist}
                </p>
              </div>
              <div className="flex w-full max-w-md flex-col items-center gap-3">
                <TransportControls />
                <SeekBar className="w-full" />
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-6">
              <div className="min-h-0 flex-1">
                <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  {t("nowPlaying.lyrics")}
                </h2>
                {currentTrack.isRadio ? (
                  <p className="text-sm text-muted-foreground">
                    {t("nowPlaying.lyricsNotAvailableForRadio")}
                  </p>
                ) : (
                  <LyricsPanel songId={currentTrack.id} />
                )}
              </div>

              <div>
                <h2 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  {t("nowPlaying.upNext")}
                </h2>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("nowPlaying.queueIsEmpty")}
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
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
          </div>
        )}
      </div>
    </div>
  )
}
