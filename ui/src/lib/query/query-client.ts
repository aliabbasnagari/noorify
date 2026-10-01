import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import i18n from "@/i18n"
import { ApiError } from "@/lib/api/http"

// 401s are already handled (session cleared + redirect to login), so a toast
// on top would just be noise.
function isAuthError(error: unknown) {
  return error instanceof ApiError && error.status === 401
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // A single shared toast id collapses a burst of failing queries (e.g. the
    // server going away while several shelves are mounted) into one message.
    onError: (error) => {
      if (isAuthError(error)) return
      toast.error(i18n.t("errors.loadFailed"), { id: "query-error" })
    },
  }),
  mutationCache: new MutationCache({
    // Mutations that define their own onError (with a specific message)
    // opt out of the generic toast via `meta: { silent: true }`.
    onError: (error, _vars, _ctx, mutation) => {
      if (isAuthError(error) || mutation.meta?.silent) return
      if (mutation.options.onError) return
      toast.error(i18n.t("errors.actionFailed"), { id: "mutation-error" })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retrying a 4xx can't help; only retry transient/network failures.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
        failureCount < 2,
    },
  },
})
