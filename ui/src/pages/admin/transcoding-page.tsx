import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/api/http"
import type { Transcoding } from "@/lib/api/types"
import { config } from "@/lib/config"
import { useAdminList } from "@/hooks/use-admin-list"
import { DataTable } from "@/components/admin/data-table"
import { TranscodingDialog } from "@/components/admin/transcoding-dialog"
import { Button } from "@/components/ui/button"

export default function TranscodingPage() {
  const {
    items,
    total,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useAdminList<Transcoding>("transcoding", {
    defaultSort: "name",
    defaultOrder: "ASC",
  })
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/transcoding/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["transcoding"] }),
  })

  const columns: ColumnDef<Transcoding, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "targetFormat", header: "Format" },
    {
      accessorKey: "defaultBitRate",
      header: "Default bit rate",
      cell: ({ row }) =>
        row.original.defaultBitRate === 0
          ? "—"
          : `${row.original.defaultBitRate} kbps`,
    },
    {
      accessorKey: "command",
      header: "Command",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate font-mono text-xs text-muted-foreground">
          {row.original.command}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        config.enableTranscodingConfig ? (
          <div className="flex justify-end gap-1">
            <TranscodingDialog
              transcoding={row.original}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Edit ${row.original.name}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => {
                if (
                  confirm(
                    `Delete transcoding profile "${row.original.name}"? This can't be undone.`,
                  )
                ) {
                  deleteMutation.mutate(row.original.id)
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transcoding</h1>
        {config.enableTranscodingConfig && (
          <TranscodingDialog
            trigger={
              <Button size="sm">
                <Plus className="size-3.5" />
                Add profile
              </Button>
            }
          />
        )}
      </div>
      {!config.enableTranscodingConfig && (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Transcoding profiles are read-only. Set{" "}
          <code className="font-mono">ND_ENABLETRANSCODINGCONFIG=true</code> on
          the server to manage them here.
        </p>
      )}
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
