import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import i18n from "@/i18n"
import { star, unstar } from "@/lib/api/subsonic"

/** `resource` selects which query family to invalidate ("album", "artist", "song"). */
export function useToggleStar(resource: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      starred ? unstar(id) : star(id),
    onError: () => toast.error(i18n.t("errors.actionFailed")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  })
}
