import { useEffect } from "react"
import { restoreSavedQueue, startQueueSync } from "@/lib/player/queue-sync"

/** Resumes the saved play queue on first load, then keeps it saved. Mounted
 * once in the authenticated shell. */
export function useQueueSync() {
  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    // Start saving only after the restore attempt, so an empty initial
    // queue can never overwrite what's stored.
    void restoreSavedQueue().then(() => {
      if (!cancelled) stop = startQueueSync()
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [])
}
