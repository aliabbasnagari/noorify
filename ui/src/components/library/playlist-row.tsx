import { useState, type MouseEvent } from "react"
import { Link } from "@tanstack/react-router"
import { Play, ListMusic } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { getCoverArtUrl } from "@/lib/api/subsonic"
import type { Playlist } from "@/lib/api/types"
import { formatDuration } from "@/lib/format"
import { playPlaylist } from "@/lib/player/play-actions"

export function PlaylistRow({ playlist }: { playlist: Playlist }) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)

  function handlePlay(event: MouseEvent) {
    event.stopPropagation()
    event.preventDefault()
    void playPlaylist(playlist.id)
  }

  return (
    <Link
      to="/playlist/$playlistId"
      params={{ playlistId: playlist.id }}
      draggable={false}
      className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
        {imgError ? (
          <ListMusic className="absolute inset-0 m-auto size-5 text-muted-foreground" />
        ) : (
          <img
            src={getCoverArtUrl(playlist.id, "pl", 96)}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            draggable={false}
            onError={() => setImgError(true)}
          />
        )}
        <Button
          size="icon-sm"
          className="absolute inset-0 m-auto rounded-full opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          aria-label={t("library.components.playlistRow.playAria", {
            name: playlist.name,
          })}
          onClick={handlePlay}
        >
          <Play className="size-3.5 fill-current" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{playlist.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t("library.components.playlistRow.ownerSongs", {
            owner: playlist.ownerName,
            count: playlist.songCount,
          })}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatDuration(playlist.duration)}
      </span>
    </Link>
  )
}
