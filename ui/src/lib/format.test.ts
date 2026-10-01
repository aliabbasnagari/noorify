import { describe, expect, it } from "vitest"
import { formatBytes, formatDuration, formatShortDuration } from "./format"

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(65)).toBe("1:05")
    expect(formatDuration(0)).toBe("0:00")
  })

  it("falls back to 0:00 for negative or non-finite input", () => {
    expect(formatDuration(-5)).toBe("0:00")
    expect(formatDuration(NaN)).toBe("0:00")
    expect(formatDuration(Infinity)).toBe("0:00")
  })
})

describe("formatBytes", () => {
  it("formats bytes with the largest whole unit", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB")
    expect(formatBytes(1024 ** 3 * 3)).toBe("3.0 GB")
  })

  it("falls back to 0 B for non-positive or non-finite input", () => {
    expect(formatBytes(-1)).toBe("0 B")
    expect(formatBytes(NaN)).toBe("0 B")
  })
})

describe("formatShortDuration", () => {
  it("formats a nanosecond duration under a minute as seconds only", () => {
    expect(formatShortDuration(45 * 1e9)).toBe("45s")
  })

  it("formats a nanosecond duration over a minute as minutes and seconds", () => {
    expect(formatShortDuration(135 * 1e9)).toBe("2m 15s")
  })

  it("falls back to 0s for non-positive or non-finite input", () => {
    expect(formatShortDuration(0)).toBe("0s")
    expect(formatShortDuration(-1)).toBe("0s")
    expect(formatShortDuration(NaN)).toBe("0s")
  })
})
