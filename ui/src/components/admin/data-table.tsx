import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export interface DataTablePagination {
  pageIndex: number
  pageSize: number
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /** Total row count on the server — drives page-count math (manualPagination). */
  rowCount: number
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  pagination: DataTablePagination
  onPaginationChange: OnChangeFn<DataTablePagination>
  isLoading?: boolean
  emptyMessage?: string
}

/**
 * Sortable/paginated table for admin CRUD screens (Phase 7/8). Deliberately
 * dumb and controlled — sorting/pagination state and its persistence in the
 * URL's search params is the page's job (via TanStack Router's typed
 * search params), not this component's, so it stays reusable across every
 * admin resource without knowing about any one route's search schema.
 */
export function DataTable<TData>({
  columns,
  data,
  rowCount,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  isLoading = false,
  emptyMessage,
}: DataTableProps<TData>) {
  const { t } = useTranslation()
  const resolvedEmptyMessage = emptyMessage ?? t("admin.dataTable.noResults")
  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
    manualSorting: true,
    manualPagination: true,
    rowCount,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-auto gap-1 px-2 py-1 font-medium"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sortDir === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : sortDir === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("admin.dataTable.loading")}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {resolvedEmptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("admin.dataTable.pageOf", {
            page: pagination.pageIndex + 1,
            pageCount: Math.max(table.getPageCount(), 1),
            rowCount,
          })}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            {t("admin.dataTable.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            {t("admin.dataTable.next")}
          </Button>
        </div>
      </div>
    </div>
  )
}
