/** Matches old-ui's BITRATE_CHOICES exactly — used for both Player.maxBitRate
 * and Transcoding.defaultBitRate. */
export const BITRATE_CHOICES = [
  32, 48, 64, 80, 96, 112, 128, 160, 192, 256, 320,
]

/** Transcoding's default-bitrate select additionally allows 0 as an explicit
 * "no default bit rate" sentinel — distinct from "unset". */
export const TRANSCODING_BITRATE_CHOICES = [0, ...BITRATE_CHOICES]
