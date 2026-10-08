import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { playerButtonFx } from "@/components/player/button-fx"
import { audioEngine } from "@/lib/player/audio-engine"
import { useCurrentTrack, usePlayerStore } from "@/stores/player-store"

/** Shared between the persistent player bar and the full-screen Now
 * Playing view — same controls, same store/engine wiring, just different
 * surrounding layout. */
export function TransportControls() {
  const { t } = useTranslation()
  const hasTrack = useCurrentTrack() !== null
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode)

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={!hasTrack}
        aria-pressed={shuffle}
        aria-label={t("player.shuffle")}
        className={cn(playerButtonFx, shuffle && "text-primary")}
        onClick={toggleShuffle}
      >
        <Shuffle />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={!hasTrack}
        aria-label={t("player.previous")}
        className={playerButtonFx}
        onClick={() => audioEngine.previous()}
      >
        <SkipBack />
      </Button>
      <Button
        size="icon-lg"
        className={cn("rounded-full", playerButtonFx)}
        disabled={!hasTrack}
        aria-label={isPlaying ? t("player.pause") : t("player.play")}
        onClick={() => audioEngine.togglePlayPause()}
      >
        {isPlaying ? <Pause /> : <Play />}
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={!hasTrack}
        aria-label={t("player.next")}
        className={playerButtonFx}
        onClick={() => audioEngine.next()}
      >
        <SkipForward />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        disabled={!hasTrack}
        aria-pressed={repeatMode !== "off"}
        aria-label={t("player.repeat", {
          mode: t(`player.repeatMode.${repeatMode}`),
        })}
        className={cn(playerButtonFx, repeatMode !== "off" && "text-primary")}
        onClick={cycleRepeatMode}
      >
        <RepeatIcon />
      </Button>
    </div>
  )
}
