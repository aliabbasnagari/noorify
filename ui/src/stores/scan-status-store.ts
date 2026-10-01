import { create } from "zustand"

/** server/events/events.go's ScanStatus event — `elapsedTime` arrives as
 * nanoseconds (a plain JSON number from Go's time.Duration), not a
 * duration string. Not persisted: this is live server state, not a
 * client preference, and would be wrong the moment it's read back stale. */
export interface ScanStatus {
  scanning: boolean
  count: number
  folderCount: number
  error: string
  scanType: string
  elapsedTime: number
  /** Only present on the Subsonic `getScanStatus` REST response used to
   * seed initial state (`lib/api/subsonic.ts`'s `getScanStatus`) — the SSE
   * push event doesn't carry it. */
  lastScan?: string
}

interface ScanStatusState {
  status: ScanStatus | null
  setStatus: (status: ScanStatus) => void
}

export const useScanStatusStore = create<ScanStatusState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}))
