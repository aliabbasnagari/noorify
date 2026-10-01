import type { MouseEvent } from "react"
import { Link } from "@tanstack/react-router"
import { Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { StarButton } from "@/components/library/star-button"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import type { Album } from "@/lib/api/types"
import { formatDuration } from "@/lib/format"
import { playAlbum } from "@/lib/player/play-actions"

export function AlbumListRow({ album }: { album: Album }) {
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
      data-slot="album-list-row"
      draggable={false}
      className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
        <img
          src={getCoverArtUrl(album.id, "al", 96)}
          alt=""
          draggable={false}
          className="size-full object-cover"
          loading="lazy"
        />
        <Button
          size="icon-sm"
          className="absolute inset-0 m-auto rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          aria-label={t("library.components.albumListRow.playAria", {
            name: album.name,
          })}
          onClick={handlePlay}
        >
          <Play className="size-3.5 fill-current" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{album.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {album.albumArtist}
        </p>
      </div>
      {album.maxYear && (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {album.maxYear}
        </span>
      )}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatDuration(album.duration)}
      </span>
      <StarButton
        resource="album"
        id={album.id}
        starred={album.starred}
        className="shrink-0"
      />
    </Link>
  )
}
