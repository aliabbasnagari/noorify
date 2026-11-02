import { useEffect } from 'react'
import { startAutoplay } from '@/lib/player/autoplay'

/** Keeps the queue topped up while Autoplay is on. Mounted once in the
 * authenticated shell. */
export function useAutoplay() {
  useEffect(() => startAutoplay(), [])
}
