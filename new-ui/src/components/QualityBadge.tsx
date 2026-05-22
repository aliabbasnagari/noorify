/**
 * QualityBadge — ported from ui/src/common/QualityInfo.jsx
 *
 * Shows a small badge like "FLAC" (lossless) or "MP3 320" (lossy + kbps).
 * Optionally shows a transcode arrow: "FLAC → MP3 192".
 */

const LOSSLESS_FORMATS = new Set(['FLAC', 'WAV', 'AIFF', 'DSF', 'DSD', 'OGG', 'OPUS', 'ALAC', 'APE', 'WV', 'WMA'])

interface Props {
  suffix?: string
  bitRate?: number
  /** When truthy, shows source → target transcode indicator */
  transcodeTarget?: { codec: string; bitrate?: number }
  className?: string
}

export function QualityBadge({ suffix, bitRate, transcodeTarget, className }: Props) {
  if (!suffix) return null

  const upper = suffix.toUpperCase()
  let label: string

  if (transcodeTarget) {
    const target = transcodeTarget.codec.toUpperCase()
    const tbr = transcodeTarget.bitrate ? ` ${Math.round(transcodeTarget.bitrate / 1000)}` : ''
    label = `${upper} → ${target}${tbr}`
  } else {
    const isLossless = LOSSLESS_FORMATS.has(upper)
    label = isLossless || !bitRate ? upper : `${upper} ${bitRate}`
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border border-white/20 text-[#a7a7a7] leading-none select-none ${className ?? ''}`}
    >
      {label}
    </span>
  )
}
