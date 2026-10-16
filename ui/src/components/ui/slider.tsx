import { useRef, useState } from 'react'
import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { cn } from 'cn'

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  hoverPreview = false,
  formatHover,
  ...props
}: SliderPrimitive.Root.Props & {
  /** Spotify-style: tint the track from the start up to the cursor while
   * hovering, showing where a click would land. */
  hoverPreview?: boolean
  /** With `hoverPreview`, also shows a tooltip above the cursor with the
   * value a click would seek to (e.g. a timestamp). */
  formatHover?: (value: number) => string
}) {
  const controlRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; value: number } | null>(null)

  function handlePointerMove(event: React.PointerEvent) {
    const el = controlRef.current
    if (!hoverPreview || !el || props.disabled) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
    setHover({ x, value: min + (x / rect.width) * (max - min) })
  }

  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn('data-horizontal:w-full data-vertical:h-full', className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control
        ref={controlRef}
        onPointerMove={hoverPreview ? handlePointerMove : undefined}
        onPointerLeave={hoverPreview ? () => setHover(null) : undefined}
        className="group/slider relative flex w-full touch-none items-center select-none data-horizontal:min-h-5 data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none transition-[height] data-horizontal:h-1.5 data-horizontal:w-full group-hover/slider:data-horizontal:h-2 data-vertical:h-full data-vertical:w-1"
        >
          {hover && (
            <div
              aria-hidden
              data-slot="slider-hover"
              className="pointer-events-none absolute inset-y-0 left-0 bg-foreground/25"
              style={{ width: hover.x }}
            />
          )}
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {hover && formatHover && (
          <div
            role="tooltip"
            data-slot="slider-hover-label"
            className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10 tabular-nums"
            style={{ left: hover.x }}
          >
            {formatHover(hover.value)}
          </div>
        )}
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className="relative block size-3.5 shrink-0 select-none rounded-full bg-white after:absolute after:-inset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
