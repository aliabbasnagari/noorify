import { useEffect, useRef, useState } from "react"
import { Download, Music, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { config, type ShareInfo } from "@/lib/config"
import { formatDuration } from "@/lib/format"
import { shareCoverUrl, shareDownloadUrl, shareStreamUrl } from "@/lib/share-url"

/**
 * The public, unauthenticated share player — server/public's handleShares
 * serves this same SPA bundle at `/share/{id}` with `window.__SHARE_INFO__`
 * injected (see main.tsx's branch on lib/config.ts's `shareInfo`). This is
 * intentionally a self-contained, chrome-less page: no sidebar/player-bar
 * shell, no auth store, no Zustand player-store/audio-engine singleton —
 * those are all authenticated-app concepts that don't apply here (a share
 * visitor has no session, and the tracks aren't addressable through the
 * authenticated Subsonic/REST clients anyway — see ShareTrack's doc
 * comment on why its ids are one-time capability tokens instead).
 */
export default function SharePlayerPage({ info }: { info: ShareInfo }) {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentTrack = currentIndex >= 0 ? info.tracks[currentIndex] : null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src = shareStreamUrl(currentTrack.id)
    void audio.play().catch(() => {})
  }, [currentTrack])

  function playAt(index: number) {
    setCurrentIndex(index)
    setIsPlaying(true)
  }

  function togglePlayPause() {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  function next() {
    if (currentIndex < info.tracks.length - 1) playAt(currentIndex + 1)
  }

  function previous() {
    if (currentIndex > 0) playAt(currentIndex - 1)
  }

  const canDownload = info.downloadable && config.enableDownloads

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={next}
      />

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            {t("share.sharedViaNavidrome")}
          </p>
          {info.description && (
            <h1 className="text-2xl font-bold text-balance">
              {info.description}
            </h1>
          )}
          {canDownload && (
            <Button variant="outline" size="sm" render={<a href={shareDownloadUrl(info.id)} />}>
              <Download className="size-3.5" />
              {t("share.downloadAll")}
            </Button>
          )}
        </div>

        <div className="space-y-1">
          {info.tracks.map((track, index) => (
            <button
              key={`${track.id}-${index}`}
              type="button"
              onClick={() => playAt(index)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent"
            >
              <div className="relative size-11 shrink-0 overflow-hidden rounded bg-muted">
                <img
                  src={shareCoverUrl(track.id, 96)}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
                {index === currentIndex && isPlaying && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Music className="size-4 animate-pulse text-primary" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    index === currentIndex
                      ? "truncate text-sm font-medium text-primary"
                      : "truncate text-sm font-medium"
                  }
                >
                  {track.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist}
                  {track.album ? ` — ${track.album}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatDuration(track.duration ?? 0)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {currentTrack && (
        <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {currentTrack.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack.artist}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("share.previous")}
              disabled={currentIndex <= 0}
              onClick={previous}
            >
              <SkipBack />
            </Button>
            <Button
              size="icon"
              className="rounded-full"
              aria-label={isPlaying ? t("share.pause") : t("share.play")}
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("share.next")}
              disabled={currentIndex >= info.tracks.length - 1}
              onClick={next}
            >
              <SkipForward />
            </Button>
          </div>
          <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
            <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {formatDuration(currentTime)}
            </span>
            <Slider
              className="flex-1"
              value={[currentTime]}
              max={duration || 1}
              step={1}
              onValueCommitted={(value) => {
                const seconds = Array.isArray(value) ? value[0] : value
                if (audioRef.current) audioRef.current.currentTime = seconds
              }}
              aria-label={t("share.seek")}
            />
            <span className="w-9 shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}
