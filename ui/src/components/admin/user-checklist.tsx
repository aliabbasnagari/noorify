import { useQuery } from "@tanstack/react-query"
import { getList } from "@/lib/api/http"
import type { AdminUser } from "@/lib/api/types"

/** Same UX/shape as `LibraryChecklist` (plain checkboxes + "select all",
 * no dedicated Checkbox primitive yet) — used for a plugin's per-user
 * access scoping, which is structurally identical to per-user library
 * assignment: a set of ids plus an "all" escape hatch. */
export function UserChecklist({
  selectedIds,
  onChange,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "list", "checklist"],
    queryFn: () =>
      getList<AdminUser>("user", { sort: "userName", order: "ASC", end: 500 }),
  })
  const users = data?.data ?? []
  const allSelected =
    users.length > 0 && users.every((u) => selectedIds.includes(u.id))

  function toggleAll() {
    onChange(allSelected ? [] : users.map((u) => u.id))
  }

  function toggleOne(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading users…</p>
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
      {users.map((user) => (
        <label key={user.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={selectedIds.includes(user.id)}
            onChange={() => toggleOne(user.id)}
          />
          {user.userName}
        </label>
      ))}
    </div>
  )
}
