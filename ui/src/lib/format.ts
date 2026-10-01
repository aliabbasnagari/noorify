export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00"
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

/** For the scan-status widget's elapsed time — `nanoseconds` matches
 * server/events/events.go's ScanStatus.elapsedTime wire format (a Go
 * time.Duration marshals as a plain nanosecond count, not a string). */
export function formatShortDuration(nanoseconds: number): string {
  if (!Number.isFinite(nanoseconds) || nanoseconds <= 0) return "0s"
  const totalSeconds = Math.floor(nanoseconds / 1e9)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"]

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  )
  const value = bytes / 1024 ** exponent
  return `${exponent === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[exponent]}`
}
