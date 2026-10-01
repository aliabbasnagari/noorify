import type { MouseEvent } from "react"
import { Link } from "@tanstack/react-router"
import { Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { StarButton } from "@/components/library/star-button"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import type { Album } from "@/lib/api/types"
import { playAlbum } from "@/lib/player/play-actions"

export function AlbumCard({ album }: { album: Album }) {
  const { t } = useTranslation()
  function handlePlay(event: MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    void playAlbum(album.id)
  }

  return (
    <Link
      to="/album/$albumId"
      params={{ albumId: album.id }}
      data-slot="album-card"
      draggable={false}
      className="group relative flex flex-col gap-2 rounded-md p-2 transition-colors hover:bg-accent"
    >
      <div className="relative aspect-square overflow-hidden rounded bg-muted">
        <img
          src={getCoverArtUrl(album.id, "al", 300)}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2 rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          aria-label={t("library.components.albumCard.playAria", {
            name: album.name,
          })}
          onClick={handlePlay}
        >
          <Play className="fill-current" />
        </Button>
      </div>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{album.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {album.albumArtist}
          </p>
        </div>
        <StarButton
          resource="album"
          id={album.id}
          starred={album.starred}
          className="shrink-0"
        />
      </div>
    </Link>
  )
}
