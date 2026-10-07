import { useQuery } from "@tanstack/react-query"
import { getList } from "@/lib/api/http"
import type { Library } from "@/lib/api/types"

/** Old-ui's per-user library assignment is a scrollable checkbox list with
 * a "select all" master checkbox — not a dropdown multi-select — since the
 * list can be long and everything needs to stay visible/scannable at once.
 * No dedicated Checkbox primitive exists in this design system yet, so
 * these are plain native checkboxes with minimal styling. */
export function LibraryChecklist({
  selectedIds,
  onChange,
}: {
  selectedIds: number[]
  onChange: (ids: number[]) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["library", "list", "checklist"],
    queryFn: () =>
      getList<Library>("library", { sort: "name", order: "ASC", end: 500 }),
  })
  const libraries = data?.data ?? []
  const allSelected =
    libraries.length > 0 && libraries.every((l) => selectedIds.includes(l.id))

  function toggleAll() {
    onChange(allSelected ? [] : libraries.map((l) => l.id))
  }

  function toggleOne(id: number) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading libraries…</p>
  }

  return (
    <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
      <label className="flex items-center gap-2 border-b border-border pb-1.5 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 rounded border-border"
          checked={allSelected}
          onChange={toggleAll}
        />
        Select all
      </label>
      {libraries.map((library) => (
        <label key={library.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={selectedIds.includes(library.id)}
            onChange={() => toggleOne(library.id)}
          />
          {library.name}
        </label>
      ))}
    </div>
  )
}
