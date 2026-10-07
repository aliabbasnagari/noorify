import { useEffect } from "react"
import { Activity, RefreshCw, TriangleAlert } from "lucide-react"
import { getScanStatus, startFullLibraryScan } from "@/lib/api/subsonic"
import { formatShortDuration } from "@/lib/format"
import { useScanStatusStore } from "@/stores/scan-status-store"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const SCAN_TYPE_LABELS: Record<string, string> = {
  full: "Full scan",
  quick: "Quick scan",
  "full-selective": "Full scan (selected libraries)",
  "quick-selective": "Quick scan (selected libraries)",
}

/** Global scan trigger + live progress — same role as old-ui's
 * ActivityPanel header widget (a popover off a small icon button, not a
 * dedicated page): driven by the `scanStatus` SSE event
 * (lib/realtime/event-stream.ts populates useScanStatusStore), seeded once
 * on mount via the Subsonic `getScanStatus` REST call so a hard reload
 * mid-scan doesn't show a stale idle state until the next SSE tick. There's
 * no known total to scan against, so this is a glanceable status (spinner/
 * counts/elapsed time), not a percentage progress bar. */
export function ScanStatusWidget() {
  const status = useScanStatusStore((s) => s.status)
  const setStatus = useScanStatusStore((s) => s.setStatus)

  useEffect(() => {
    getScanStatus()
      .then(setStatus)
      .catch(() => {})
  }, [setStatus])

  const scanning = status?.scanning ?? false
  const hasError = !!status?.error

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Scan status"
            className={hasError ? "text-destructive" : undefined}
          />
        }
      >
        {scanning ? (
          <RefreshCw className="size-4 animate-spin" />
        ) : hasError ? (
          <TriangleAlert className="size-4" />
        ) : (
          <Activity className="size-4" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-3">
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            {scanning ? "Scanning…" : "Idle"}
            {status?.scanType &&
              ` — ${SCAN_TYPE_LABELS[status.scanType] ?? status.scanType}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {status
              ? `${status.folderCount} folders scanned`
              : "No scan status yet"}
            {status && ` · ${formatShortDuration(status.elapsedTime)}`}
          </p>
          {hasError && (
            <p className="text-xs text-destructive">{status?.error}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={scanning}
            onClick={() => void startFullLibraryScan(false)}
          >
            Quick scan
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={scanning}
            onClick={() => void startFullLibraryScan(true)}
          >
            Full scan
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
