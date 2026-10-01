import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import i18n from "@/i18n"
import { setRating } from "@/lib/api/subsonic"

export function useSetRating(resource: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      setRating(id, rating),
    onError: () => toast.error(i18n.t("errors.actionFailed")),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  })
}
