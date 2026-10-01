import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "cn"

interface WithId {
  id: string
}

interface DragState {
  startX: number
  startScrollLeft: number
  moved: boolean
}

export function Shelf<T extends WithId>({
  title,
  items,
  isLoading,
  renderItem,
}: {
  title: string
  items: T[]
  isLoading: boolean
  renderItem: (item: T) => ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)

  // A plain vertical mouse wheel does nothing on a horizontal-only overflow
  // container by default — Spotify (and most horizontal-shelf UIs) convert
  // it to horizontal scroll instead, but only while the shelf actually has
  // room left to scroll in that direction ("scroll chaining"): once it hits
  // its start/end, the gesture falls through to the page's normal vertical
  // scroll instead of getting stuck. A genuine horizontal trackpad swipe
  // (deltaX already dominant) is left alone for the browser's native
  // handling either way.
  //
  // This must be a real, non-passive DOM listener, not React's `onWheel` —
  // React registers wheel listeners as passive by default (for scroll-perf
  // reasons), which silently makes `preventDefault()` a no-op and was
  // exactly why the horizontal conversion and the page's native vertical
  // scroll were both firing at once.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const atStart = el.scrollLeft <= 0
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
      const scrollingForward = e.deltaY > 0
      if ((scrollingForward && atEnd) || (!scrollingForward && atStart)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [])

  // Click-and-drag-to-scroll, mouse only — touch already scrolls this
  // natively (with momentum our own pointer-move tracking can't replicate),
  // so this would only make touch scrolling feel worse.
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return
    const el = scrollRef.current
    if (!el) return
    dragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft, moved: false }
    // Pointer capture is acquired lazily, only once real dragging is
    // confirmed (see handlePointerMove) — capturing here unconditionally
    // would retarget the click event that follows a plain, un-moved click
    // to this container instead of the card underneath it, breaking every
    // click, not just drags.
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const el = scrollRef.current
    if (!drag || !el) return
    const delta = e.clientX - drag.startX
    if (!drag.moved && Math.abs(delta) > 6) {
      drag.moved = true
      el.setPointerCapture(e.pointerId)
    }
    if (!drag.moved) return
    el.scrollLeft = drag.startScrollLeft - delta
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const el = scrollRef.current
    dragRef.current = null
    if (!el) return
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    if (!drag?.moved) return
    // A real drag happened — suppress the click that would otherwise fire
    // on whatever card is under the cursor (e.g. navigating into an album)
    // once the pointer is released.
    el.addEventListener(
      "click",
      (ev) => {
        ev.stopPropagation()
        ev.preventDefault()
      },
      { capture: true, once: true },
    )
  }

  if (!isLoading && items.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div
        ref={scrollRef}
        className={cn(
          "no-scrollbar flex gap-4 overflow-x-auto pb-2",
          !isLoading && "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-56 w-40 shrink-0 animate-pulse rounded-md bg-muted"
              />
            ))
          : items.map((item) => (
              <div key={item.id} className="w-40 shrink-0">
                {renderItem(item)}
              </div>
            ))}
      </div>
    </section>
  )
}
