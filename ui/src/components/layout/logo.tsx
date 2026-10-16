import { cn } from 'cn'

/** The app's icon mark (same artwork as the favicon/PWA icons), used as the
 * brand mark in the topbar in place of a text wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}android-chrome-192x192.png`}
      alt=""
      draggable={false}
      className={cn('shrink-0 rounded-full object-contain', className)}
    />
  )
}
