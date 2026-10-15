import { Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { playerButtonFx } from '@/components/player/button-fx'
import { usePlayerStore } from '@/stores/player-store'

/** Mute toggle + volume slider, shared by the player bar and Now Playing. */
export function VolumeControl({ className }: { className?: string }) {
  const { t } = useTranslation()
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={muted ? t('player.bar.unmute') : t('player.bar.mute')}
        className={playerButtonFx}
        onClick={toggleMute}
      >
        {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
      </Button>
      <div className="w-24">
        <Slider
          hoverPreview
          value={[muted ? 0 : volume]}
          max={100}
          step={1}
          onValueChange={(value) =>
            setVolume(Array.isArray(value) ? value[0] : value)
          }
          aria-label={t('player.bar.volume')}
        />
      </div>
    </div>
  )
}
