/**
 * Server-Sent Events hook for Navidrome real-time events.
 * Connects to /api/events?jwt=TOKEN and dispatches typed events.
 */
import { useEffect, useRef, useCallback } from 'react'
import { getStoredAuth } from '@/lib/api'

export type NDEvent =
  | { name: 'scanStatus'; data: { scanning: boolean; count: number; folderCount: number } }
  | { name: 'refreshResource'; data: { resource: string } }
  | { name: 'nowPlayingCount'; data: { count: number } }
  | { name: 'keepAlive'; data: Record<string, never> }

type EventHandler = (event: NDEvent) => void

export function useEventStream(onEvent: EventHandler) {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    const auth = getStoredAuth()
    if (!auth?.token) return

    const es = new EventSource(`/api/events?jwt=${encodeURIComponent(auth.token)}`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as { name: string; data: unknown }
        handlerRef.current(payload as NDEvent)
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      es.close()
      // Reconnect after 5s
      reconnectTimer.current = setTimeout(connect, 5000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [connect])
}
