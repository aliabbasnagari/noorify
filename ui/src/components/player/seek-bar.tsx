import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Slider } from "@/components/ui/slider"
import { formatDuration } from "@/lib/format"
import { audioEngine } from "@/lib/player/audio-engine"
import { useCurrentTrack, usePlayerStore } from "@/stores/player-store"

export function SeekBar({ className }: { className?: string }) {
  const { t } = useTranslation()
  const currentTrack = useCurrentTrack()
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const [scrubTime, setScrubTime] = useState<number | null>(null)

  if (currentTrack?.isRadio) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center gap-1.5 py-1">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">
            {t("player.liveRadio")}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex w-full items-center gap-2">
        <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {formatDuration(scrubTime ?? currentTime)}
        </span>
        <Slider
          className="flex-1"
          value={[scrubTime ?? currentTime]}
          max={duration || 1}
          step={1}
          disabled={!currentTrack}
          onValueChange={(value) =>
            setScrubTime(Array.isArray(value) ? value[0] : value)
          }
          onValueCommitted={(value) => {
            const seconds = Array.isArray(value) ? value[0] : value
            audioEngine.seek(seconds)
            setScrubTime(null)
          }}
          aria-label={t("player.seek")}
        />
        <span className="w-9 shrink-0 text-xs text-muted-foreground tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  )
}
