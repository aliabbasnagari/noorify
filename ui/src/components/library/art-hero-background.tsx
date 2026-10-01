import { useDominantColor } from "@/hooks/use-dominant-color"

/**
 * The Spotify-style hero gradient behind an album/artist header. Never
 * "jank"s on navigation: a neutral gradient is visible immediately (no
 * blank flash while the real color is being extracted), and the tinted
 * layer cross-fades in via opacity once ready — CSS can't smoothly
 * interpolate between two different gradient color stops directly, so a
 * second overlaid layer + opacity transition is the reliable way to
 * animate this at all.
 */
export function ArtHeroBackground({ imageUrl }: { imageUrl: string | null }) {
  const color = useDominantColor(imageUrl)

  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-card to-background" />
      <div
        className="absolute inset-0 bg-gradient-to-b to-background transition-opacity duration-700 ease-out"
        style={{
          backgroundImage: color
            ? `linear-gradient(to bottom, ${color}, var(--background))`
            : undefined,
          opacity: color ? 1 : 0,
        }}
      />
    </div>
  )
}
