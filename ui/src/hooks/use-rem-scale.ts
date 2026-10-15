import { useEffect, useState } from 'react'

function readScale(): number {
  if (typeof document === 'undefined') return 1
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(px) && px > 0 ? px / 16 : 1
}

/** Root font size relative to the 16px default (see the responsive `html`
 * font-size in index.css). Pixel measurements that must track rem-based
 * content — virtualized row heights, card minimum widths — multiply by this so
 * they grow with the text instead of clipping it. */
export function useRemScale(): number {
  const [scale, setScale] = useState(readScale)
  useEffect(() => {
    const update = () => setScale(readScale())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}
