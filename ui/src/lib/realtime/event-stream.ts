import { config } from "@/lib/config"
import { queryClient } from "@/lib/query/query-client"
import { useAuthStore } from "@/stores/auth-store"
import { useScanStatusStore, type ScanStatus } from "@/stores/scan-status-store"

const RECONNECT_DELAY_MS = 5000
const MAX_RECONNECT_DELAY_MS = 60_000

let initialized = false
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function parseEvent<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

let eventSource: EventSource | null = null
let connectedToken: string | null = null

// Every query hook must key its queries starting with the resource name
// (e.g. ["album", "list", ...]) so this invalidation stays a plain prefix match.
function handleRefreshResource(event: MessageEvent<string>) {
  const payload = parseEvent<Record<string, string[]>>(event.data)
  if (!payload) return
  for (const resource of Object.keys(payload)) {
    queryClient.invalidateQueries({ queryKey: [resource] })
  }
}

function connect() {
  const token = useAuthStore.getState().session?.token
  if (!token) return

  eventSource?.close()
  connectedToken = token

  // EventSource can't set headers, so the token travels as a query param —
  // meaning it goes stale the moment the sliding-refresh mechanism rotates
  // it. The subscribe() below reopens the connection whenever that happens.
  const source = new EventSource(
    `${config.baseURL}/api/events?jwt=${encodeURIComponent(token)}`,
  )
  eventSource = source

  source.addEventListener("serverStart", (e: MessageEvent) =>
    console.debug("[sse] serverStart", e.data),
  )
  source.addEventListener("scanStatus", (e: MessageEvent<string>) => {
    const status = parseEvent<ScanStatus>(e.data)
    if (status) useScanStatusStore.getState().setStatus(status)
  })
  source.addEventListener("nowPlayingCount", (e: MessageEvent) =>
    console.debug("[sse] nowPlayingCount", e.data),
  )
  source.addEventListener("keepAlive", () => {})
  source.addEventListener("refreshResource", handleRefreshResource)

  source.onopen = () => {
    reconnectAttempts = 0
  }

  source.onerror = () => {
    source.close()
    // A stale source (replaced by a newer connect()) must not schedule
    // another reconnect on top of the live one.
    if (eventSource !== source) return
    eventSource = null
    // Exponential backoff so an expired token or a down server doesn't get
    // hammered every 5s forever.
    const delay = Math.min(
      RECONNECT_DELAY_MS * 2 ** reconnectAttempts,
      MAX_RECONNECT_DELAY_MS,
    )
    reconnectAttempts++
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (useAuthStore.getState().session) connect()
    }, delay)
  }
}

function disconnect() {
  eventSource?.close()
  eventSource = null
  connectedToken = null
  reconnectAttempts = 0
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

/**
 * Call once at app startup. Keeps the SSE connection in sync with auth
 * state: opens it on login, closes it on logout, and reopens it whenever
 * the sliding-refresh token rotates.
 */
export function initEventStream() {
  if (initialized) return
  initialized = true
  if (useAuthStore.getState().session) connect()

  useAuthStore.subscribe((state) => {
    const token = state.session?.token ?? null
    if (!token) {
      disconnect()
      return
    }
    if (token !== connectedToken) {
      connect()
    }
  })
}
