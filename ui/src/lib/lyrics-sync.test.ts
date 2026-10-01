import { describe, expect, it } from "vitest"
import { currentLineIndex } from "./lyrics-sync"

describe("currentLineIndex", () => {
  const lines = [{ start: 1000 }, { start: 5000 }, { start: 10000 }]

  it("returns -1 before the first line starts", () => {
    expect(currentLineIndex(lines, 0, 0)).toBe(-1)
  })

  it("returns the line whose start exactly matches the current time", () => {
    expect(currentLineIndex(lines, 0, 1)).toBe(0)
  })

  it("returns the last line whose start has passed", () => {
    expect(currentLineIndex(lines, 0, 6)).toBe(1)
  })

  it("returns the final line once past the last start time", () => {
    expect(currentLineIndex(lines, 0, 999)).toBe(2)
  })

  it("shifts every line's timing by the offset", () => {
    // Line 1 starts at 5000ms, but a +2000ms offset means it doesn't count
    // as current until 7s of playback, not 5s.
    expect(currentLineIndex(lines, 2000, 6)).toBe(0)
    expect(currentLineIndex(lines, 2000, 7)).toBe(1)
  })

  it("returns -1 for an empty line list", () => {
    expect(currentLineIndex([], 0, 100)).toBe(-1)
  })
})
