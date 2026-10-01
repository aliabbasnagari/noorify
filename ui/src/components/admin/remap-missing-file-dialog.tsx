import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api/http"
import { search3 } from "@/lib/api/subsonic"
import type { MissingFile } from "@/lib/api/types"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** The manual counterpart to the scanner's own move-detection: "this
 * missing track was actually re-imported as this other, already-present
 * track" — for when the scanner didn't recognize it as a move on its own
 * (e.g. a retag changed enough metadata to look like a different file).
 * `POST /api/missing/{id}/remap` had no route until this session; there's
 * no old-ui precedent for this UI since it was never exposed there either. */
export function RemapMissingFileDialog({
  missingFile,
  open,
  onOpenChange,
}: {
  missingFile: MissingFile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["search3", "remap-target", debouncedQuery],
    queryFn: () => search3(debouncedQuery, { songCount: 15, albumCount: 0, artistCount: 0 }),
    enabled: debouncedQuery.length > 0,
  })

  const mutation = useMutation({
    mutationFn: (targetId: string) =>
      apiFetch(`/api/missing/${missingFile.id}/remap`, {
        method: "POST",
        body: { targetId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missing"] })
      handleOpenChange(false)
    },
  })

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) setQuery("")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remap missing file</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Find the track that <span className="font-mono">{missingFile.path}</span>{" "}
          was actually re-imported as, and its play history/ratings/playlist
          entries will move onto it.
        </p>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for the replacement track…"
          autoFocus
        />
        {mutation.isError && (
          <p className="text-sm text-destructive">
            Couldn't remap — the target may itself be missing, or something
            went wrong. Try again.
          </p>
        )}
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading && debouncedQuery && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {data?.songs.map((song) => (
            <button
              key={song.id}
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(song.id)}
              className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-accent disabled:opacity-50"
            >
              <span className="truncate text-sm font-medium">{song.title}</span>
              <span className="truncate text-xs text-muted-foreground">
                {song.artist} — {song.album}
              </span>
            </button>
          ))}
          {debouncedQuery && !isLoading && data?.songs.length === 0 && (
            <p className="text-sm text-muted-foreground">No matches.</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(false)}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}
