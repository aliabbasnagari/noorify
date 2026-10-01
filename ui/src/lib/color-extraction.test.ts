import { afterEach, describe, expect, it } from "vitest"
import {
  dominantColorFromPixels,
  extractDominantColor,
} from "./color-extraction"

function solidPixels(
  r: number,
  g: number,
  b: number,
  count = 4,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4)
  for (let i = 0; i < count; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return data
}

describe("dominantColorFromPixels", () => {
  it("picks out a saturated color from mostly-neutral pixels", () => {
    // 3 grey (unsaturated) pixels + 1 vivid red — the weighting should
    // still favor the red, not average everything into muddy grey.
    const data = new Uint8ClampedArray([
      ...[128, 128, 128, 255],
      ...[128, 128, 128, 255],
      ...[128, 128, 128, 255],
      ...[255, 0, 0, 255],
    ])
    const color = dominantColorFromPixels(data)
    const [r, g, b] = color.match(/\d+/g)!.map(Number)
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })

  it("returns a solid color's own value when every pixel matches", () => {
    // Unsaturated (grey) but still opaque and present — a uniform weighted
    // average of identical pixels is just that pixel, regardless of weight.
    const data = solidPixels(128, 128, 128)
    expect(dominantColorFromPixels(data)).toBe("rgb(128, 128, 128)")
  })

  it("ignores fully-transparent pixels", () => {
    const data = new Uint8ClampedArray(16) // all zero, alpha included -> all transparent
    expect(dominantColorFromPixels(data)).toBe("rgb(60, 60, 60)")
  })
})

describe("extractDominantColor", () => {
  const originalImage = globalThis.Image

  afterEach(() => {
    globalThis.Image = originalImage
  })

  it("resolves null when the image fails to load, without throwing", async () => {
    class FailingImage {
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    // @ts-expect-error - minimal stand-in for the DOM Image constructor
    globalThis.Image = FailingImage

    const color = await extractDominantColor(
      "https://example.test/never-loads.jpg",
    )
    expect(color).toBeNull()
  })

  it("caches the result so a repeat call doesn't construct a new Image", async () => {
    let constructedCount = 0
    class FailingImage {
      onerror: (() => void) | null = null
      constructor() {
        constructedCount += 1
      }
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    // @ts-expect-error - minimal stand-in for the DOM Image constructor
    globalThis.Image = FailingImage

    const url = "https://example.test/cached.jpg"
    await extractDominantColor(url)
    await extractDominantColor(url)
    expect(constructedCount).toBe(1)
  })
})
