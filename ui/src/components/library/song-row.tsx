import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { MoreHorizontal, Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StarButton } from "@/components/library/star-button"
import { ShareDialog } from "@/components/library/share-dialog"
import { useResourceList } from "@/hooks/use-resource-list"
import { apiFetch } from "@/lib/api/http"
import { downloadUrl } from "@/lib/api/subsonic"
import { config } from "@/lib/config"
import { formatDuration } from "@/lib/format"
import type { Playlist, Song } from "@/lib/api/types"

function addSongToPlaylist(playlistId: string, songId: string) {
  return apiFetch(`/api/playlist/${playlistId}/tracks`, {
    method: "POST",
    body: { ids: [songId] },
  })
}

export function SongRow({
  song,
  index,
  displayNumber,
  showAlbum = false,
  active = false,
  onPlay,
  onPlayNext,
  onAddToQueue,
}: {
  song: Song
  /** Absolute position in the queue this row will start playback from. */
  index: number
  /** Shown instead of `index + 1` — e.g. the track's real per-disc track
   * number, which differs from its absolute position once there's more
   * than one disc. */
  displayNumber?: number
  showAlbum?: boolean
  active?: boolean
  onPlay: () => void
  onPlayNext: () => void
  onAddToQueue: () => void
}) {
  // Same query the sidebar's playlist section uses — TanStack Query
  // dedupes identical concurrent requests, so N song rows opening their
  // menu doesn't mean N network calls.
  const { t } = useTranslation()
  const { data: playlists } = useResourceList<Playlist>("playlist", {
    sort: "name",
    order: "ASC",
    end: 200,
  })
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <div
      data-slot="song-row"
      className={cn(
        "group grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent",
        active && "bg-accent",
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        className="flex size-6 items-center justify-center text-sm text-muted-foreground"
        aria-label={t("library.components.songRow.playAria", {
          title: song.title,
        })}
      >
        <span className={cn("group-hover:hidden", active && "text-primary")}>
          {displayNumber ?? index + 1}
        </span>
        <Play className="hidden size-3.5 fill-current group-hover:block" />
      </button>

      <button type="button" onClick={onPlay} className="min-w-0 text-left">
        <p
          className={cn(
            "truncate text-sm font-medium",
            active && "text-primary",
          )}
        >
          {song.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {song.artist}
          {showAlbum && ` — ${song.album}`}
        </p>
      </button>

      <StarButton resource="song" id={song.id} starred={song.starred} />

      <div className="flex items-center gap-1">
        <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
          {formatDuration(song.duration)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("library.components.songRow.moreOptionsAria")}
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPlay}>
              {t("library.components.songRow.playNow")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPlayNext}>
              {t("library.components.songRow.playNext")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddToQueue}>
              {t("library.components.songRow.addToQueue")}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {t("library.components.songRow.addToPlaylist")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {playlists?.data.length ? (
                  playlists.data.map((playlist) => (
                    <DropdownMenuItem
                      key={playlist.id}
                      onClick={() => addSongToPlaylist(playlist.id, song.id)}
                    >
                      {playlist.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    {t("library.components.songRow.noPlaylists")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              render={
                <Link to="/album/$albumId" params={{ albumId: song.albumId }} />
              }
            >
              {t("library.components.songRow.goToAlbum")}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link
                  to="/artist/$artistId"
                  params={{ artistId: song.artistId }}
                />
              }
            >
              {t("library.components.songRow.goToArtist")}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<a href={downloadUrl(song.id)} download />}
            >
              {t("library.components.songRow.download")}
            </DropdownMenuItem>
            {config.enableSharing && (
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                {t("library.components.songRow.share")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {config.enableSharing && (
          <ShareDialog
            resourceIds={[song.id]}
            open={shareOpen}
            onOpenChange={setShareOpen}
          />
        )}
      </div>
    </div>
  )
}
