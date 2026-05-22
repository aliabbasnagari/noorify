import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import {
  login as apiLogin,
  createAdmin as apiCreateAdmin,
  clearAuth,
  getStoredAuth,
  isAuthenticated,
  type AuthInfo,
} from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthInfo | null
  isLoading: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  createAdmin: (username: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    user: isAuthenticated() ? getStoredAuth() : null,
    isLoading: false,
    error: null,
  }))

  // Restore auth on mount (handles page refresh)
  useEffect(() => {
    if (isAuthenticated() && !state.user) {
      const stored = getStoredAuth()
      if (stored) {
        setState((s) => ({ ...s, user: stored }))
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const user = await apiLogin(username, password)
      setState({ user, isLoading: false, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setState((s) => ({ ...s, isLoading: false, error: msg }))
      throw err
    }
  }, [])

  const createAdmin = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      const user = await apiCreateAdmin(username, password)
      setState({ user, isLoading: false, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Setup failed'
      setState((s) => ({ ...s, isLoading: false, error: msg }))
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setState({ user: null, isLoading: false, error: null })
  }, [])

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }))
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, createAdmin, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
