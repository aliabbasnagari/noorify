import { Library as LibraryIcon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useLibraryStore } from "@/stores/library-store"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * Multi-select library switcher, matching old-ui's
 * `old-ui/src/common/LibrarySelector.jsx` union-selection UX: a trigger
 * summarizing the selection, opening a popover with a "select all/none"
 * master checkbox plus one checkbox per library. See `library-store.ts`'s
 * `activeLibraryIds` doc comment for the exact `[]`-means-"all accessible"
 * selection semantics this reproduces, quirks included.
 *
 * No query key in this app currently incorporates `activeLibraryIds`
 * (unlike the stale claim in an earlier revision of this component), so
 * changing the selection wouldn't refetch anything on its own. Matching
 * old-ui's own `refresh()`-on-popover-close behavior, every query is
 * invalidated when the popover closes rather than threading the selection
 * into every list page's query key individually.
 */
export function LibrarySwitcher() {
  const libraries = useLibraryStore((s) => s.libraries)
  const activeLibraryIds = useLibraryStore((s) => s.activeLibraryIds)
  const toggleLibraryId = useLibraryStore((s) => s.toggleLibraryId)
  const setAllLibrariesSelected = useLibraryStore((s) => s.setAllLibrariesSelected)
  const queryClient = useQueryClient()

  if (libraries.length <= 1) return null

  const selectedCount = activeLibraryIds.length
  const totalCount = libraries.length
  const isAllSelected = selectedCount === totalCount
  const isNoneSelected = selectedCount === 0
  const isIndeterminate = !isAllSelected && !isNoneSelected

  const summary = isNoneSelected
    ? `None (0 of ${totalCount})`
    : isAllSelected
      ? `All libraries (${totalCount})`
      : `${selectedCount} of ${totalCount} libraries`

  return (
    <div className="px-2 pb-2">
      <Popover
        onOpenChange={(open) => {
          if (!open) queryClient.invalidateQueries()
        }}
      >
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="w-full justify-start">
              <LibraryIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{summary}</span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-64 p-2">
          <label className="flex items-center gap-2 border-b border-border px-1 pb-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate
              }}
              onChange={() => setAllLibrariesSelected(!isAllSelected)}
            />
            Select libraries
          </label>
          <div className="mt-1 max-h-64 space-y-1 overflow-y-auto">
            {libraries.map((library) => (
              <label
                key={library.id}
                className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={activeLibraryIds.includes(library.id)}
                  onChange={() => toggleLibraryId(library.id)}
                />
                {library.name}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
