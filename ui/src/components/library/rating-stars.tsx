import { useState } from "react"
import { Star } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { useSetRating } from "@/hooks/use-rating"

const VALUES = [1, 2, 3, 4, 5]

export function RatingStars({
  resource,
  id,
  rating,
  className,
}: {
  resource: string
  id: string
  rating: number
  className?: string
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState<number | null>(null)
  const [optimistic, setOptimistic] = useState<number | null>(null)
  const [lastRating, setLastRating] = useState(rating)
  const { mutate } = useSetRating(resource)

  // Reset during render, not in an effect — see StarButton for why.
  if (rating !== lastRating) {
    setLastRating(rating)
    setOptimistic(null)
  }

  const displayed = hovered ?? optimistic ?? rating

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onMouseLeave={() => setHovered(null)}
    >
      {VALUES.map((value) => (
        <button
          key={value}
          type="button"
          aria-label={t("library.components.ratingStars.rateAria", {
            count: value,
          })}
          className="p-0.5"
          onMouseEnter={() => setHovered(value)}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            // Clicking the currently-set rating clears it.
            const next = value === rating ? 0 : value
            setOptimistic(next)
            // Roll back on failure — see StarButton for why.
            mutate({ id, rating: next }, { onError: () => setOptimistic(null) })
          }}
        >
          <Star
            className={cn(
              "size-3.5",
              value <= displayed
                ? "fill-current text-primary"
                : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  )
}
