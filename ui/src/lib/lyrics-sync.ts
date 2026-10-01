/** Index of the last line whose (start + offset) has passed, or -1 before
 * the first line starts. Times are milliseconds; `currentTimeSec` is
 * seconds (matches the player store's telemetry unit). */
export function currentLineIndex(
  lines: { start?: number }[],
  offsetMs: number,
  currentTimeSec: number,
): number {
  const nowMs = currentTimeSec * 1000
  let index = -1
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i].start ?? 0) + offsetMs <= nowMs) index = i
    else break
  }
  return index
}
