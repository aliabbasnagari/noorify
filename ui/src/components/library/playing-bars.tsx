import { cn } from "cn"

const DELAYS = ["0ms", "200ms", "100ms"]

/** Spotify-style equalizer shown in place of a track number on the row that's
 * currently loaded in the player: animated while playing, flat when paused. */
export function PlayingBars({
  playing,
  className,
}: {
  playing: boolean
  className?: string
}) {
  return (
    <span
      data-slot="playing-bars"
      aria-hidden
      className={cn("flex h-3.5 items-end gap-0.5 text-primary", className)}
    >
      {DELAYS.map((delay) => (
        <span
          key={delay}
          className="h-full w-0.5 origin-bottom rounded-full bg-current"
          style={
            playing
              ? {
                  animation: "playing-bar 0.9s ease-in-out infinite",
                  animationDelay: delay,
                }
              : { transform: "scaleY(0.25)" }
          }
        />
      ))}
    </span>
  )
}
