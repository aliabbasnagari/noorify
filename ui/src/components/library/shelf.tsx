import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useRemScale } from '@/hooks/use-rem-scale'

interface WithId {
  id: string
}

const CARD_MIN_WIDTH = 160
const GAP = 16
/** Used before the first measurement (and where ResizeObserver is missing). */
const FALLBACK_COLUMNS = 6

/**
 * A Spotify-style home section: one row showing only as many cards as fit
 * the available width (no horizontal scrolling), with an optional action
 * (e.g. a "Show all" link) at the header's right edge that opens the full
 * list on its own page.
 */
export function Shelf<T extends WithId>({
  title,
  items,
  isLoading,
  renderItem,
  action,
}: {
  title: string
  items: T[]
  isLoading: boolean
  renderItem: (item: T) => ReactNode
  action?: ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(FALLBACK_COLUMNS)
  const scale = useRemScale()

  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setColumns(
        Math.max(1, Math.floor((width + GAP) / (CARD_MIN_WIDTH * scale + GAP))),
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoading, items.length, scale])

  if (!isLoading && items.length === 0) return null

  const visible = items.slice(0, columns)

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {action}
      </div>
      <div
        ref={rowRef}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {isLoading
          ? Array.from({ length: columns }, (_, i) => (
              <div
                key={i}
                className="aspect-[5/7] animate-pulse rounded-md bg-muted"
              />
            ))
          : visible.map((item) => (
              <div key={item.id} className="min-w-0">
                {renderItem(item)}
              </div>
            ))}
      </div>
    </section>
  )
}
