import type { ReactNode } from 'react'
import { cn } from 'cn'

/** Shared rounded-card surface for now-playing-style panels (the "/now-playing"
 * route and the desktop right rail), so both stay visually consistent. */
export function PanelCard({
  title,
  action,
  compact = false,
  children,
}: {
  title: string
  action?: ReactNode
  compact?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'rounded-xl bg-card/80 shadow-sm backdrop-blur',
        compact ? 'p-4' : 'p-6',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-4',
          compact ? 'mb-3' : 'mb-4',
        )}
      >
        <h2 className={compact ? 'text-lg font-bold' : 'text-xl font-bold'}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
