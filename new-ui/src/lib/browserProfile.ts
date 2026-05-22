/**
 * Browser codec detection and profile building.
 *
 * Probes the browser's actual audio codec support via Audio.canPlayType() and
 * builds the JSON body required by Navidrome's getTranscodeDecision endpoint.
 *
 * The server uses this profile to decide whether the browser can direct-play a
 * given song or whether it needs to transcode it, and to which format/bitrate.
 */

const CLIENT_NAME = 'NavidromeUI'

// ─── Codec probe table ────────────────────────────────────────────────────────

/** Each entry describes one codec/container combination. */
interface CodecProbe {
  codec: string
  container: string
  mime: string[]
}

const CODEC_PROBES: CodecProbe[] = [
  { codec: 'mp3',    container: 'mp3',  mime: ['audio/mpeg; codecs="mp3"'] },
  { codec: 'opus',   container: 'ogg',  mime: ['audio/ogg; codecs="opus"'] },
  { codec: 'vorbis', container: 'ogg',  mime: ['audio/ogg; codecs="vorbis"'] },
  { codec: 'flac',   container: 'flac', mime: ['audio/flac', 'audio/flac; codecs="flac"'] },
  { codec: 'wav',    container: 'wav',  mime: ['audio/wav; codecs="1"'] },
  { codec: 'alac',   container: 'mp4',  mime: ['audio/mp4; codecs="alac"'] },
  { codec: 'aac',    container: 'mp4',  mime: ['audio/mp4; codecs="mp4a.40.2"'] },
]

// Transcoding targets in preference order (lossless first, then lossy).
// MP3 is always kept as the universal fallback.
const TRANSCODE_CODECS = ['flac', 'opus', 'mp3'] as const

// Safari cannot reliably stream Ogg containers (reports canPlayType support but
// fails on non-seekable transcoded streams), and FLAC transcoding also fails in
// practice.  Limit Safari to mp3-only transcoding.
const SAFARI_TRANSCODE_CODECS = ['mp3'] as const

// ─── Types matching the getTranscodeDecision request body ─────────────────────

export interface DirectPlayProfile {
  containers: string[]
  audioCodecs: string[]
  protocols: string[]
}

export interface TranscodingProfile {
  container: string
  audioCodec: string
  protocol: string
}

export interface BrowserProfile {
  name: string
  platform: string
  directPlayProfiles: DirectPlayProfile[]
  transcodingProfiles: TranscodingProfile[]
  codecProfiles: []
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canPlay(audio: HTMLAudioElement, mimeList: string[]): boolean {
  return mimeList.some((m) => {
    const result = audio.canPlayType(m)
    return result === 'probably' || result === 'maybe'
  })
}

function isSafari(): boolean {
  const ua = navigator.userAgent
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Probe the browser's codec support and return a BrowserProfile for the server. */
export function detectBrowserProfile(): BrowserProfile {
  const audio = new Audio()

  const supportedProbes = CODEC_PROBES.filter(({ mime }) => canPlay(audio, mime))

  const directPlayProfiles: DirectPlayProfile[] = supportedProbes.map(
    ({ codec, container }) => ({
      containers: [container],
      audioCodecs: [codec],
      protocols: ['http'],
    }),
  )

  const transcodeCodecs = isSafari() ? SAFARI_TRANSCODE_CODECS : TRANSCODE_CODECS

  const transcodingProfiles: TranscodingProfile[] = transcodeCodecs.reduce<TranscodingProfile[]>(
    (profiles, codec) => {
      const probe = CODEC_PROBES.find((p) => p.codec === codec)
      if (!probe) return profiles
      // Always include mp3 as final fallback, even if canPlayType is unclear.
      if (canPlay(audio, probe.mime) || codec === 'mp3') {
        profiles.push({
          container: probe.container,
          audioCodec: codec,
          protocol: 'http',
        })
      }
      return profiles
    },
    [],
  )

  return {
    name: CLIENT_NAME,
    platform: navigator.userAgent,
    directPlayProfiles,
    transcodingProfiles,
    codecProfiles: [],
  }
}
