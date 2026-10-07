import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { apiFetch } from "@/lib/api/http"
import type { Plugin, PluginManifest } from "@/lib/api/types"
import { useAdminList } from "@/hooks/use-admin-list"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function parseManifest(raw: string): PluginManifest | null {
  try {
    return JSON.parse(raw) as PluginManifest
  } catch {
    return null
  }
}

export default function PluginsPage() {
  const {
    items,
    total,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useAdminList<Plugin>("plugin", { defaultSort: "id", defaultOrder: "ASC" })
  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiFetch<Plugin>(`/api/plugin/${id}`, {
        method: "PUT",
        body: { enabled },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plugin"] }),
  })

  const rescanMutation = useMutation({
    mutationFn: () => apiFetch("/api/plugin/rescan", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plugin"] }),
  })

  const columns: ColumnDef<Plugin, unknown>[] = [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const manifest = parseManifest(row.original.manifest)
        return (
          <Link
            to="/admin/plugins/$pluginId"
            params={{ pluginId: row.original.id }}
            className="font-medium hover:underline"
          >
            {manifest?.name ?? row.original.id}
          </Link>
        )
      },
    },
    {
      id: "description",
      header: "Description",
      cell: ({ row }) => {
        const manifest = parseManifest(row.original.manifest)
        return (
          <span className="block max-w-sm truncate text-xs text-muted-foreground">
            {manifest?.description ?? ""}
          </span>
        )
      },
    },
    {
      id: "version",
      header: "Version",
      cell: ({ row }) => parseManifest(row.original.manifest)?.version ?? "—",
    },
    {
      id: "status",
      header: "Enabled",
      cell: ({ row }) => {
        const plugin = row.original
        if (plugin.lastError) {
          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="flex items-center gap-1.5 text-sm text-destructive" />
                }
              >
                <TriangleAlert className="size-4" />
                Error
              </TooltipTrigger>
              <TooltipContent>{plugin.lastError}</TooltipContent>
            </Tooltip>
          )
        }
        return (
          <Switch
            checked={plugin.enabled}
            onCheckedChange={(enabled) =>
              toggleMutation.mutate({ id: plugin.id, enabled })
            }
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plugins</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={rescanMutation.isPending}
          onClick={() => rescanMutation.mutate()}
        >
          <RefreshCw
            className={
              rescanMutation.isPending ? "size-3.5 animate-spin" : "size-3.5"
            }
          />
          Rescan
        </Button>
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
        emptyMessage="No plugins found — try rescanning."
      />
    </div>
  )
}
