import type { MouseEvent } from "react"
import { Link } from "@tanstack/react-router"
import { Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { StarButton } from "@/components/library/star-button"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import type { Artist } from "@/lib/api/types"
import { playArtist } from "@/lib/player/play-actions"

export function ArtistCard({ artist }: { artist: Artist }) {
  const { t } = useTranslation()
  function handlePlay(event: MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    void playArtist(artist.id)
  }

  return (
    <Link
      to="/artist/$artistId"
      params={{ artistId: artist.id }}
      data-slot="artist-card"
      draggable={false}
      className="group relative flex flex-col items-center gap-2 rounded-md p-3 text-center transition-colors hover:bg-accent"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-muted">
        <img
          src={getCoverArtUrl(artist.id, "ar", 300)}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <Button
          size="icon"
          className="absolute right-1 bottom-1 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          aria-label={t("library.components.artistCard.playAria", {
            name: artist.name,
          })}
          onClick={handlePlay}
        >
          <Play className="fill-current" />
        </Button>
      </div>
      <div className="flex w-full min-w-0 items-center justify-center gap-1">
        <p className="truncate text-sm font-medium">{artist.name}</p>
        <StarButton resource="artist" id={artist.id} starred={artist.starred} />
      </div>
    </Link>
  )
}
