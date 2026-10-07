import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowRightLeft, Trash2 } from "lucide-react"
import { apiFetch, getList } from "@/lib/api/http"
import type { Library, MissingFile } from "@/lib/api/types"
import { formatBytes } from "@/lib/format"
import { useAdminList } from "@/hooks/use-admin-list"
import { DataTable } from "@/components/admin/data-table"
import { RemapMissingFileDialog } from "@/components/admin/remap-missing-file-dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL_LIBRARIES = "__all"

export default function MissingFilesPage() {
  const [libraryFilter, setLibraryFilter] = useState(ALL_LIBRARIES)
  const [remapping, setRemapping] = useState<MissingFile | null>(null)
  const queryClient = useQueryClient()

  const { data: libraries } = useQuery({
    queryKey: ["library", "list", "for-missing-filter"],
    queryFn: () =>
      getList<Library>("library", { sort: "name", order: "ASC", end: 200 }),
  })

  const {
    items,
    total,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useAdminList<MissingFile>("missing", {
    defaultSort: "updated_at",
    defaultOrder: "DESC",
    filter:
      libraryFilter === ALL_LIBRARIES
        ? undefined
        : { library_id: libraryFilter },
  })

  const deleteOneMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/missing?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missing"] }),
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => apiFetch("/api/missing", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missing"] }),
  })

  const columns: ColumnDef<MissingFile, unknown>[] = [
    { accessorKey: "libraryName", header: "Library" },
    {
      accessorKey: "path",
      header: "Path",
      cell: ({ row }) => (
        <span className="block max-w-md truncate text-xs text-muted-foreground">
          {row.original.path}
        </span>
      ),
    },
    {
      accessorKey: "size",
      header: "Size",
      cell: ({ row }) => formatBytes(row.original.size),
    },
    {
      accessorKey: "updatedAt",
      header: "Last seen",
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Remap ${row.original.path} to an existing track`}
            onClick={() => setRemapping(row.original)}
          >
            <ArrowRightLeft className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${row.original.path} from the library`}
            onClick={() => deleteOneMutation.mutate(row.original.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Missing Files</h1>
        <div className="flex items-center gap-2">
          <Select
            value={libraryFilter}
            onValueChange={(v) => v && setLibraryFilter(v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_LIBRARIES}>All libraries</SelectItem>
              {libraries?.data.map((lib) => (
                <SelectItem key={lib.id} value={String(lib.id)}>
                  {lib.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={total === 0}
            onClick={() => {
              if (
                confirm(
                  `Remove all ${total} missing file${total === 1 ? "" : "s"} from the library? This can't be undone.`,
                )
              ) {
                deleteAllMutation.mutate()
              }
            }}
          >
            <Trash2 className="size-3.5" />
            Remove all
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Tracks the scanner could no longer find on disk. Removing an entry only
        deletes it from the library database — it never touches anything on your
        filesystem.
      </p>
      <DataTable
        columns={columns}
        data={items}
        rowCount={total}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        emptyMessage="No missing files."
      />
      {remapping && (
        <RemapMissingFileDialog
          missingFile={remapping}
          open={!!remapping}
          onOpenChange={(open) => !open && setRemapping(null)}
        />
      )}
    </div>
  )
}
