import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/api/http"
import type { AdminUser } from "@/lib/api/types"
import { useAdminList } from "@/hooks/use-admin-list"
import { useAuthStore } from "@/stores/auth-store"
import { DataTable } from "@/components/admin/data-table"
import { UserDialog } from "@/components/admin/user-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function formatDate(iso?: string) {
  if (!iso) return "Never"
  return new Date(iso).toLocaleString()
}

export default function UsersPage() {
  const session = useAuthStore((s) => s.session)
  const {
    items,
    total,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useAdminList<AdminUser>("user", {
    defaultSort: "userName",
    defaultOrder: "ASC",
  })
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/user/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user"] }),
  })

  const columns: ColumnDef<AdminUser, unknown>[] = [
    { accessorKey: "userName", header: "Username" },
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "isAdmin",
      header: "Admin",
      cell: ({ row }) =>
        row.original.isAdmin ? <Badge variant="secondary">Admin</Badge> : null,
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last login",
      cell: ({ row }) => formatDate(row.original.lastLoginAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const isSelf = row.original.id === session?.id
        return (
          <div className="flex justify-end gap-1">
            <UserDialog
              user={row.original}
              trigger={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Edit ${row.original.userName}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete ${row.original.userName}`}
              disabled={isSelf}
              onClick={() => {
                if (
                  confirm(
                    `Delete user "${row.original.userName}"? This can't be undone.`,
                  )
                ) {
                  deleteMutation.mutate(row.original.id)
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
        <h1 className="text-2xl font-bold">Users</h1>
        <UserDialog
          trigger={
            <Button size="sm">
              <Plus className="size-3.5" />
              Add user
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
