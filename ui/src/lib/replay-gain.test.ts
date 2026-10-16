import { describe, expect, it } from 'vitest'
import { replayGainFactor } from './replay-gain'

const info = {
  rgAlbumGain: -6,
  rgAlbumPeak: 0.8,
  rgTrackGain: 3,
  rgTrackPeak: 0.5,
}

describe('replayGainFactor', () => {
  it('is unity when disabled', () => {
    expect(replayGainFactor('none', 0, info)).toBe(1)
  })

  it('converts the album gain from dB', () => {
    expect(replayGainFactor('album', 0, info)).toBeCloseTo(10 ** (-6 / 20))
  })

  it('adds the pre-amp to the gain', () => {
    expect(replayGainFactor('album', 3, info)).toBeCloseTo(10 ** (-3 / 20))
  })

  it('uses the track values in track mode', () => {
    // +3 dB would be ~1.41, but the 0.5 peak allows at most 2.0.
    expect(replayGainFactor('track', 0, info)).toBeCloseTo(10 ** (3 / 20))
  })

  it('caps the boost so the peak stays below full scale', () => {
    expect(
      replayGainFactor('track', 0, { rgTrackGain: 12, rgTrackPeak: 0.9 }),
    ).toBeCloseTo(1 / 0.9)
  })

  it('plays untagged tracks unchanged', () => {
    expect(replayGainFactor('album', 5, {})).toBe(1)
    expect(replayGainFactor('track', 5, { rgTrackGain: null })).toBe(1)
  })

  it('never boosts past unity without a peak', () => {
    expect(replayGainFactor('track', 0, { rgTrackGain: 6 })).toBe(1)
    expect(
      replayGainFactor('track', 0, { rgTrackGain: 6, rgTrackPeak: null }),
    ).toBe(1)
    expect(replayGainFactor('track', 0, { rgTrackGain: -6 })).toBeCloseTo(
      10 ** (-6 / 20),
    )
  })
})
