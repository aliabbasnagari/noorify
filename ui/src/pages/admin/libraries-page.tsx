import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/api/http"
import { startScan } from "@/lib/api/subsonic"
import type { Library } from "@/lib/api/types"
import { formatBytes } from "@/lib/format"
import { useAdminList } from "@/hooks/use-admin-list"
import { DataTable } from "@/components/admin/data-table"
import { LibraryDialog } from "@/components/admin/library-dialog"
import { Button } from "@/components/ui/button"

function formatDate(iso?: string) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (date.getFullYear() <= 1) return "Never"
  return date.toLocaleString()
}

export default function LibrariesPage() {
  const {
    items,
    total,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useAdminList<Library>("library", {
    defaultSort: "name",
    defaultOrder: "ASC",
  })
  const queryClient = useQueryClient()
  const [scanningId, setScanningId] = useState<number | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/library/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
  })

  async function handleScan(library: Library, fullScan: boolean) {
    setScanningId(library.id)
    try {
      await startScan(library.id, fullScan)
    } finally {
      setScanningId(null)
      queryClient.invalidateQueries({ queryKey: ["library"] })
    }
  }

  const columns: ColumnDef<Library, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "path",
      header: "Path",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate text-xs text-muted-foreground">
          {row.original.path}
        </span>
      ),
    },
    { accessorKey: "totalSongs", header: "Songs" },
    { accessorKey: "totalAlbums", header: "Albums" },
    {
      accessorKey: "totalSize",
      header: "Size",
      cell: ({ row }) => formatBytes(row.original.totalSize),
    },
    {
      accessorKey: "lastScanAt",
      header: "Last scan",
      cell: ({ row }) => formatDate(row.original.lastScanAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const library = row.original
        const scanning = library.fullScanInProgress || scanningId === library.id
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Scan ${library.name}`}
              disabled={scanning}
              onClick={() => void handleScan(library, false)}
            >
              <RefreshCw
                className={scanning ? "size-3.5 animate-spin" : "size-3.5"}
              />
            </Button>
            <LibraryDialog
              library={library}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Edit ${library.name}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete ${library.name}`}
              disabled={library.id === 1}
              onClick={() => {
                if (
                  confirm(
                    `Delete library "${library.name}"? This can't be undone.`,
                  )
                ) {
                  deleteMutation.mutate(library.id)
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Libraries</h1>
        <LibraryDialog
          trigger={
            <Button size="sm">
              <Plus className="size-3.5" />
              Add library
            </Button>
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={items}
        rowCount={total}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
      />
    </div>
  )
}
