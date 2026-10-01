import { useEffect } from "react"
import { apiFetch } from "@/lib/api/http"
import type { Library as LibraryResource } from "@/lib/api/types"
import { useAuthStore } from "@/stores/auth-store"
import { useLibraryStore } from "@/stores/library-store"

/**
 * Populates the active-library switcher (`stores/library-store.ts`) from
 * the caller's own library access — `GET /api/user/{id}/library` was
 * admin-only until this session's fix (`server/nativeapi/library.go`); a
 * non-admin previously had no endpoint at all to learn their own library
 * assignment, so this store's `libraries` array was set only from that
 * store's own unit test and never from real data anywhere in the app.
 * Call once, near the root of the authenticated tree.
 */
export function useSyncUserLibraries() {
  const userId = useAuthStore((s) => s.session?.id)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    apiFetch<LibraryResource[]>(`/api/user/${userId}/library`)
      .then((libraries) => {
        if (!cancelled) {
          useLibraryStore
            .getState()
            .setLibraries(libraries.map((l) => ({ id: l.id, name: l.name })))
        }
      })
      .catch(() => {
        // A stale/expired session mid-request is already handled by
        // apiFetch's 401 handling (clears the auth store); anything else
        // just leaves the switcher at its previous (or empty) state.
      })
    return () => {
      cancelled = true
    }
  }, [userId])
}
