import { useState } from "react"
import { Heart } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { useToggleStar } from "@/hooks/use-star"

export function StarButton({
  resource,
  id,
  starred,
  className,
}: {
  resource: string
  id: string
  starred: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const [lastStarred, setLastStarred] = useState(starred)
  const { mutate } = useToggleStar(resource)

  // Drop the optimistic override once the server-confirmed value catches up
  // (via the mutation's onSettled invalidation), so we never get stuck
  // showing a stale state if the write actually failed. Reset during render
  // rather than in an effect — an effect would commit one extra frame with
  // the stale optimistic value still showing.
  if (starred !== lastStarred) {
    setLastStarred(starred)
    setOptimistic(null)
  }

  const isStarred = optimistic ?? starred

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(isStarred && "text-primary", className)}
      aria-pressed={isStarred}
      aria-label={
        isStarred
          ? t("library.components.starButton.removeAria")
          : t("library.components.starButton.addAria")
      }
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        setOptimistic(!isStarred)
        // On failure the server value never changes, so the render-time
        // reset above never fires — roll the optimistic override back here.
        mutate(
          { id, starred: isStarred },
          { onError: () => setOptimistic(null) },
        )
      }}
    >
      <Heart className={cn("size-4", isStarred && "fill-current")} />
    </Button>
  )
}
