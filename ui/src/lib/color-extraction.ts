// Client-side dominant-color extraction for the album hero gradient — the
// signature Spotify visual. Requests a small server-resized thumbnail
// (rather than decoding the full display-size cover) and caches the result
// per URL in memory, so re-visiting an album never redoes the canvas work —
// the two costs the plan flagged as needing real budget, not an afterthought.

const EXTRACTION_SIZE = 64
const cache = new Map<string, string | null>()

export async function extractDominantColor(
  imageUrl: string,
): Promise<string | null> {
  if (cache.has(imageUrl)) return cache.get(imageUrl)!

  const color = await new Promise<string | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = EXTRACTION_SIZE
        canvas.height = EXTRACTION_SIZE
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, EXTRACTION_SIZE, EXTRACTION_SIZE)
        const { data } = ctx.getImageData(
          0,
          0,
          EXTRACTION_SIZE,
          EXTRACTION_SIZE,
        )
        resolve(dominantColorFromPixels(data))
      } catch {
        // Cross-origin art without CORS headers taints the canvas —
        // getImageData throws. Degrade to no gradient, not a crash.
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imageUrl
  })

  cache.set(imageUrl, color)
  return color
}

/**
 * A lightweight stand-in for a full Vibrant.js-style quantizer: weight each
 * pixel by how saturated it is (near-black/near-white/grey pixels barely
 * count) and average, so busy or monochrome cover art still yields a color
 * that reads as "vibrant" rather than a muddy grey average. Exported (not
 * just internal) so the pure pixel math is unit-testable without a canvas —
 * jsdom doesn't implement one, so `extractDominantColor` itself only
 * degrades-gracefully-on-load-failure is realistically testable outside a
 * real browser (see e2e for the rest).
 */
export function dominantColorFromPixels(data: Uint8ClampedArray): string {
  let r = 0
  let g = 0
  let b = 0
  let weightSum = 0

  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i]
    const pg = data[i + 1]
    const pb = data[i + 2]
    const alpha = data[i + 3]
    if (alpha < 200) continue

    const max = Math.max(pr, pg, pb)
    const min = Math.min(pr, pg, pb)
    const lightness = (max + min) / 2
    const saturation =
      max === min ? 0 : (max - min) / (255 - Math.abs(2 * lightness - 255))
    const weight = saturation * saturation + 0.05

    r += pr * weight
    g += pg * weight
    b += pb * weight
    weightSum += weight
  }

  if (weightSum === 0) return "rgb(60, 60, 60)"
  return `rgb(${Math.round(r / weightSum)}, ${Math.round(g / weightSum)}, ${Math.round(b / weightSum)})`
}
