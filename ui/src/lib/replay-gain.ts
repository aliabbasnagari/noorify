import type { ReplayGainMode } from '@/stores/settings-store'

/** The ReplayGain tags the native `/api/song/{id}` record carries. Each is
 * `null` when the file has no such tag. */
export interface ReplayGainInfo {
  rgAlbumGain?: number | null
  rgAlbumPeak?: number | null
  rgTrackGain?: number | null
  rgTrackPeak?: number | null
}

/**
 * Linear amplitude factor for a `GainNode`, per the ReplayGain 1.0 spec: the
 * tagged gain (dB) plus the user's pre-amp, capped so the track's peak can't
 * exceed full scale. A track without the relevant gain tag plays unchanged;
 * one with a gain but no peak is never boosted past unity, since clipping
 * can't be ruled out.
 */
export function replayGainFactor(
  mode: ReplayGainMode,
  preAmp: number,
  info: ReplayGainInfo,
): number {
  if (mode === 'none') return 1
  const gain = mode === 'album' ? info.rgAlbumGain : info.rgTrackGain
  const peak = mode === 'album' ? info.rgAlbumPeak : info.rgTrackPeak
  if (gain == null) return 1
  const limit = peak != null && peak > 0 ? 1 / peak : 1
  return Math.min(10 ** ((gain + preAmp) / 20), limit)
}
