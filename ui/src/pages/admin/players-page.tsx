import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
import { apiFetch, getList } from "@/lib/api/http"
import type { Player, Transcoding } from "@/lib/api/types"
import { useAdminList } from "@/hooks/use-admin-list"
import { useAuthStore } from "@/stores/auth-store"
import { DataTable } from "@/components/admin/data-table"
import { PlayerDialog } from "@/components/admin/player-dialog"
import { Button } from "@/components/ui/button"

function formatDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

export default function PlayersPage() {
  const isAdmin = useAuthStore((s) => s.session?.isAdmin ?? false)
  const {
    items,
    total,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useAdminList<Player>("player", {
    defaultSort: "name",
    defaultOrder: "ASC",
  })
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Player | null>(null)

  const { data: transcodingById } = useQuery({
    queryKey: ["transcoding", "list", "for-players-page"],
    queryFn: async () => {
      const { data } = await getList<Transcoding>("transcoding", { end: 200 })
      return new Map(data.map((t) => [t.id, t.name]))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/player/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["player"] }),
  })

  const columns: ColumnDef<Player, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    ...(isAdmin
      ? [
          { accessorKey: "userName", header: "User" } as ColumnDef<
            Player,
            unknown
          >,
        ]
      : []),
    {
      accessorKey: "transcodingId",
      header: "Transcoding",
      cell: ({ row }) =>
        row.original.transcodingId
          ? (transcodingById?.get(row.original.transcodingId) ??
            row.original.transcodingId)
          : "—",
    },
    {
      accessorKey: "maxBitRate",
      header: "Max bit rate",
      cell: ({ row }) =>
        row.original.maxBitRate ? `${row.original.maxBitRate} kbps` : "—",
    },
    {
      accessorKey: "lastSeen",
      header: "Last seen",
      cell: ({ row }) => formatDate(row.original.lastSeen),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Edit ${row.original.name}`}
            onClick={() => setEditing(row.original)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete ${row.original.name}`}
            onClick={() => {
              if (
                confirm(
                  `Delete player "${row.original.name}"? This can't be undone.`,
                )
              ) {
                deleteMutation.mutate(row.original.id)
              }
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Players</h1>
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
      {editing && (
        <PlayerDialog
          player={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  )
}
