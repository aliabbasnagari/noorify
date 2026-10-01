import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Link } from "@tanstack/react-router"
import { ListMusic, Play, Share2, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { apiFetch, getOne } from "@/lib/api/http"
import type { Playlist, PlaylistTrack } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { EditPlaylistDialog } from "@/components/library/edit-playlist-dialog"
import { ShareDialog } from "@/components/library/share-dialog"
import { SortableTrackRow } from "@/components/library/sortable-track-row"
import { config } from "@/lib/config"
import { playPlaylist } from "@/lib/player/play-actions"
import { formatDuration } from "@/lib/format"
import {
  playlistTrackToQueuedTrack,
  useCurrentTrack,
  usePlayerStore,
} from "@/stores/player-store"

function tracksQueryKey(playlistId: string) {
  return ["playlist", "tracks", playlistId]
}

function fetchTracks(playlistId: string) {
  return apiFetch<PlaylistTrack[]>(
    `/api/playlist/${playlistId}/tracks?_end=2000`,
  )
}

export default function PlaylistDetailPage({
  playlistId,
}: {
  playlistId: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setQueue = usePlayerStore((s) => s.setQueue)
  const currentTrack = useCurrentTrack()

  const { data: playlist, isLoading: playlistLoading } = useQuery({
    queryKey: ["playlist", "detail", playlistId],
    queryFn: () => getOne<Playlist>("playlist", playlistId),
  })

  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: tracksQueryKey(playlistId),
    queryFn: () => fetchTracks(playlistId),
  })

  const reorderMutation = useMutation({
    mutationFn: ({
      pos,
      insertBefore,
    }: {
      pos: string
      insertBefore: string
    }) =>
      apiFetch(`/api/playlist/${playlistId}/tracks/${pos}`, {
        method: "PUT",
        body: { insert_before: insertBefore },
      }),
    onMutate: async ({ pos, insertBefore }) => {
      await queryClient.cancelQueries({ queryKey: tracksQueryKey(playlistId) })
      const previous = queryClient.getQueryData<PlaylistTrack[]>(
        tracksQueryKey(playlistId),
      )
      if (previous) {
        const oldIndex = previous.findIndex((t) => t.id === pos)
        const newIndex = previous.findIndex((t) => t.id === insertBefore)
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = [...previous]
          const [moved] = reordered.splice(oldIndex, 1)
          reordered.splice(newIndex, 0, moved)
          queryClient.setQueryData(tracksQueryKey(playlistId), reordered)
        }
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tracksQueryKey(playlistId), context.previous)
      }
    },
    // The server renumbers every track's position id in the shifted range
    // on every reorder (see persistence/playlist_track_repository.go's
    // Reorder) — the optimistic list above is right about *order* but its
    // ids are now stale, so a real refetch is required, not just settling
    // for the optimistic state.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: tracksQueryKey(playlistId) }),
  })

  const removeMutation = useMutation({
    mutationFn: (trackId: string) =>
      apiFetch(`/api/playlist/${playlistId}/tracks/${trackId}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: tracksQueryKey(playlistId) }),
  })

  const deletePlaylistMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/playlist/${playlistId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist"] })
      navigate({ to: "/playlists" })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderMutation.mutate({
      pos: String(active.id),
      insertBefore: String(over.id),
    })
  }

  if (playlistLoading)
    return <p className="py-16 text-muted-foreground">{t("playlist.loading")}</p>
  if (!playlist)
    return (
      <p className="py-16 text-muted-foreground">
        {t("playlist.playlistNotFound")}
      </p>
    )

  const trackList = tracks ?? []
  const isSmart = playlist.rules !== null
  // Only the *track list* is non-editable for smart/synced playlists (it's
  // derived, not stored) — the playlist itself is still renameable,
  // deletable, and (for smart playlists) has its rules editable. Phase 3
  // wrongly gated all of these together; fixed here since this is exactly
  // when rule-editing came online.
  const tracksEditable = !isSmart && !playlist.sync

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          {playlist.rules
            ? t("playlist.smartPlaylist")
            : t("playlist.playlist")}
        </p>
        <h1 className="text-4xl font-bold text-balance">{playlist.name}</h1>
        {playlist.comment && (
          <p className="text-muted-foreground">{playlist.comment}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {playlist.ownerName} ·{" "}
          {t("playlist.songCount", { count: playlist.songCount })} ·{" "}
          {formatDuration(playlist.duration)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="icon"
          className="size-12 rounded-full"
          aria-label={t("playlist.playName", { name: playlist.name })}
          onClick={() => void playPlaylist(playlist.id)}
        >
          <Play className="size-5 fill-current" />
        </Button>
        {isSmart ? (
          <Button variant="outline" size="sm" render={<Link to="/playlist/$playlistId/rules" params={{ playlistId }} />}>
            <ListMusic className="size-3.5" />
            {t("playlist.editRules")}
          </Button>
        ) : (
          <EditPlaylistDialog playlist={playlist} />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (
              confirm(
                t("playlist.deleteConfirm", { name: playlist.name }),
              )
            ) {
              deletePlaylistMutation.mutate()
            }
          }}
        >
          <Trash2 className="size-3.5" />
          {t("playlist.delete")}
        </Button>
        {config.enableSharing && (
          <ShareDialog
            resourceIds={[playlist.id]}
            trigger={
              <Button variant="outline" size="sm">
                <Share2 className="size-3.5" />
                {t("playlist.share")}
              </Button>
            }
          />
        )}
      </div>

      {tracksLoading ? (
        <p className="text-muted-foreground">{t("playlist.loadingTracks")}</p>
      ) : trackList.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {t("playlist.playlistIsEmpty")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={trackList.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div>
              {trackList.map((track, index) => (
                <SortableTrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  editable={tracksEditable}
                  active={currentTrack?.id === track.mediaFileId}
                  onPlay={() =>
                    setQueue(trackList.map(playlistTrackToQueuedTrack), index)
                  }
                  onPlayNext={() =>
                    usePlayerStore
                      .getState()
                      .playNextInQueue(playlistTrackToQueuedTrack(track))
                  }
                  onAddToQueue={() =>
                    usePlayerStore
                      .getState()
                      .addToQueue(playlistTrackToQueuedTrack(track))
                  }
                  onRemove={() => removeMutation.mutate(track.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
