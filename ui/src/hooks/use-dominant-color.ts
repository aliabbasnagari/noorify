import { useEffect, useState } from "react"
import { extractDominantColor } from "@/lib/color-extraction"

export function useDominantColor(imageUrl: string | null): string | null {
  const [color, setColor] = useState<string | null>(null)
  const [lastUrl, setLastUrl] = useState(imageUrl)

  // Reset synchronously during render on a URL change, not in the effect
  // below — see StarButton/RatingStars for why (avoids an extra committed
  // frame showing the previous album's stale color).
  if (imageUrl !== lastUrl) {
    setLastUrl(imageUrl)
    setColor(null)
  }

  useEffect(() => {
    if (!imageUrl) return
    let cancelled = false
    void extractDominantColor(imageUrl).then((c) => {
      if (!cancelled) setColor(c)
    })
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return color
}
