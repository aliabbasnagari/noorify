/**
 * Thin compatibility shim — delegates to sonner.
 * All existing `useToast()` call sites continue to work unchanged.
 */
import { toast as sonnerToast } from 'sonner'

export function useToast() {
  return {
    success: (message: string) => sonnerToast.success(message),
    error:   (message: string) => sonnerToast.error(message),
    info:    (message: string) => sonnerToast(message),
  }
}

/** No-op provider kept for backward-compat. App.tsx supplies <Toaster> instead. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
