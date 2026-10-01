import { config } from "@/lib/config"
import { getAuthToken, useAuthStore } from "@/stores/auth-store"
import { useLibraryStore } from "@/stores/library-store"

const AUTH_HEADER = "X-ND-Authorization"
const CLIENT_ID_HEADER = "X-ND-Client-Unique-Id"

// One id per app load, sent on every request so the server can distinguish
// this browser tab/device from others for the same user (e.g. now-playing).
//
// crypto.randomUUID only exists in secure contexts (HTTPS/localhost), and
// self-hosted servers are often reached over plain HTTP on a LAN — so fall
// back to getRandomValues (available everywhere) instead of crashing on load.
function generateClientId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

const clientUniqueId = generateClientId()

export function apiUrl(path: string): string {
  return `${config.baseURL}${path}`
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

/**
 * Raw fetch wrapper for the native REST API (`/api`, `/auth`). Attaches the
 * sliding-refresh auth header and, on every response, persists the rotated
 * token the server re-issues (see server/auth.go's JWTRefresher) — skipping
 * this silently breaks auth after the original token's window elapses.
 */
async function request(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")
  headers.set(CLIENT_ID_HEADER, clientUniqueId)

  const token = getAuthToken()
  if (token) {
    headers.set(AUTH_HEADER, `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
    body = JSON.stringify(options.body)
  }

  const response = await fetch(apiUrl(path), { ...options, headers, body })

  const refreshedToken = response.headers.get(AUTH_HEADER)
  if (refreshedToken) {
    useAuthStore.getState().setToken(refreshedToken)
  }

  if (!response.ok) {
    let parsedBody: unknown = null
    try {
      parsedBody = await response.json()
    } catch {
      // Non-JSON error body (e.g. plain-text 401) — fall through with null.
    }
    if (response.status === 401) handleUnauthorized()
    throw new ApiError(response.statusText, response.status, parsedBody)
  }

  return response
}

/**
 * Drops the session and sends the user to the login page. Clearing the
 * store alone doesn't move an already-mounted authenticated route (TanStack
 * Router's `beforeLoad` auth guards only run on navigation, not reactively).
 * This module can't import the router itself without a circular dependency
 * (router.tsx transitively imports every route, most of which import this
 * module), so navigate via the hash directly instead — the router uses
 * `createHashHistory()` and reacts to `hashchange`.
 */
export function handleUnauthorized() {
  useAuthStore.getState().clear()
  if (window.location.hash !== "#/login") {
    window.location.hash = "/login"
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await request(path, options)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export type Order = "ASC" | "DESC"

export interface ListParams {
  sort?: string
  order?: Order
  filter?: Record<string, unknown>
  start?: number
  end?: number
}

export interface ListResult<T> {
  data: T[]
  total: number
}

function buildListQuery(params: ListParams): string {
  const search = new URLSearchParams()
  // Every param the deluan/rest-backed native REST API actually recognizes
  // is underscore-prefixed (`_sort`/`_order`/`_start`/`_end`/`_filters`) —
  // confirmed against server/nativeapi/native_api_song_test.go. Anything
  // NOT starting with `_` is instead swept up as a literal filter field
  // name by that library's generic query parser (persistence/sql_restful.go
  // logs this as "Ignoring filter not whitelisted"), so a bare `sort=`/
  // `order=`/`filter=` silently does nothing rather than erroring — this
  // was wrong from Phase 0 onward until caught here via a user-reported log.
  if (params.sort) search.set("_sort", params.sort)
  if (params.order) search.set("_order", params.order)

  // Empty selection means "no filter" (all accessible libraries) — see
  // library-store.ts's activeLibraryIds doc comment. Changing the
  // selection doesn't refetch in-flight/cached queries by itself; see
  // library-switcher.tsx's invalidateQueries()-on-close.
  const activeLibraryIds = useLibraryStore.getState().activeLibraryIds
  const filter =
    activeLibraryIds.length > 0
      ? { ...params.filter, library_id: activeLibraryIds }
      : params.filter
  if (filter && Object.keys(filter).length > 0) {
    search.set("_filters", JSON.stringify(filter))
  }

  if (params.start !== undefined) search.set("_start", String(params.start))
  if (params.end !== undefined) search.set("_end", String(params.end))
  return search.toString()
}

/** GETs a react-admin-style list resource (`?_sort=&_order=&_filters=&_start=&_end=`). */
export async function getList<T>(
  resource: string,
  params: ListParams = {},
): Promise<ListResult<T>> {
  const query = buildListQuery(params)
  const path = query ? `/api/${resource}?${query}` : `/api/${resource}`
  const response = await request(path)
  const data = (await response.json()) as T[]
  const total = Number(response.headers.get("X-Total-Count") ?? data.length)
  return { data, total }
}

export function getOne<T>(resource: string, id: string | number): Promise<T> {
  return apiFetch<T>(`/api/${resource}/${id}`)
}
