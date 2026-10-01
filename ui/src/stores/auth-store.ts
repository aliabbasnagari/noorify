import { create } from "zustand"
import { persist } from "zustand/middleware"
import { config } from "@/lib/config"

export interface AuthSession {
  token: string
  id: string
  name: string
  username: string
  isAdmin: boolean
  avatar?: string
  subsonicSalt: string
  subsonicToken: string
}

interface AuthState {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  /** Applies the rotated token every authenticated response carries (sliding refresh). */
  setToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      setToken: (token) =>
        set((state) =>
          state.session ? { session: { ...state.session, token } } : state,
        ),
      clear: () => set({ session: null }),
    }),
    { name: "nd-auth" },
  ),
)

// Non-reactive accessors for use outside React (fetch wrappers, the SSE client).
export function getAuthToken(): string | null {
  return useAuthStore.getState().session?.token ?? null
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().session !== null
}

/**
 * Reverse-proxy trusted-header sessions arrive pre-authenticated via the
 * server-injected config (see server/auth.go's handleLoginFromHeaders) —
 * call once at startup so those sessions skip the login form entirely.
 */
export function bootstrapAuthFromServerConfig() {
  if (config.auth) {
    useAuthStore.getState().setSession(config.auth)
  }
}

/**
 * Only proxy-authenticated sessions go to the IdP; others get the login
 * form. Returns whether it already redirected the browser away (to the
 * IdP) — callers should navigate to `/login` themselves otherwise, since
 * clearing the store alone doesn't move an already-mounted authenticated
 * route: TanStack Router's `beforeLoad` auth guards only run on
 * navigation, not reactively when the store changes underneath them.
 */
export function logout(): boolean {
  const { session, clear } = useAuthStore.getState()
  clear()
  if (session && config.extAuthLogoutURL) {
    window.location.href = config.extAuthLogoutURL
    return true
  }
  return false
}
