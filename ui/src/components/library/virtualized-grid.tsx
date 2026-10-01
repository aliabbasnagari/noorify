import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useTranslation } from "react-i18next"
import { cn } from "cn"

/**
 * Windowed grid over a (possibly 50k+ row) resource list. Renders only the
 * rows near the viewport and calls `onLoadMore` as the user scrolls toward
 * the end of what's currently loaded — validates virtualization against
 * real `_start`/`_end` pagination rather than assuming it "just works" at
 * scale (see useInfiniteResourceList).
 *
 * Owns its own scroll (rather than relying on an ancestor), so give it a
 * bounded height via `className` (e.g. `flex-1 min-h-0` in a flex column) —
 * two nested scroll containers would otherwise fight each other.
 */
export function VirtualizedGrid<T>({
  items,
  total,
  itemMinWidth,
  itemHeight,
  gap = 16,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  renderItem,
  emptyMessage,
  className,
  columns: fixedColumns,
}: {
  items: T[]
  total: number
  itemMinWidth: number
  itemHeight: number
  gap?: number
  isFetchingNextPage: boolean
  hasNextPage: boolean
  onLoadMore: () => void
  renderItem: (item: T, index: number) => ReactNode
  emptyMessage?: string
  className?: string
  /** Skip width-based column measurement (e.g. a list view forcing 1). */
  columns?: number
}) {
  const { t } = useTranslation()
  const parentRef = useRef<HTMLDivElement>(null)
  const [measuredColumns, setMeasuredColumns] = useState(1)
  const columns = fixedColumns ?? measuredColumns

  useLayoutEffect(() => {
    if (fixedColumns) return
    const el = parentRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setMeasuredColumns(
        Math.max(1, Math.floor((width + gap) / (itemMinWidth + gap))),
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [gap, itemMinWidth, fixedColumns])

  const rowCount = Math.max(1, Math.ceil(total / columns))

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan: 3,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const lastVirtualRowIndex = virtualRows[virtualRows.length - 1]?.index

  useEffect(() => {
    if (lastVirtualRowIndex === undefined) return
    // Compare against what's actually loaded, not the full `total` row
    // count: the scroll height is sized for `total`, so the viewport can
    // reach not-yet-fetched (blank) rows long before it nears the very end.
    const loadedRows = Math.ceil(items.length / columns)
    if (
      lastVirtualRowIndex >= loadedRows - 3 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      onLoadMore()
    }
  }, [
    lastVirtualRowIndex,
    items.length,
    columns,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  ])

  if (total === 0 && !isFetchingNextPage) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {emptyMessage ?? t("library.components.virtualizedGrid.empty")}
      </p>
    )
  }

  return (
    <div
      ref={parentRef}
      data-slot="virtualized-grid"
      className={cn("overflow-y-auto", className)}
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns
          const rowItems = items.slice(startIndex, startIndex + columns)
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap,
              }}
            >
              {rowItems.map((item, i) => renderItem(item, startIndex + i))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
