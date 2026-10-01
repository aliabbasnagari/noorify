import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { SortingState } from "@tanstack/react-table"
import { getList, type Order } from "@/lib/api/http"
import type { DataTablePagination } from "@/components/admin/data-table"

/** Shared sorting/pagination-state + fetch wiring for every admin CRUD list
 * (Users/Libraries/Players/Transcoding) — `DataTable` itself stays a dumb,
 * controlled component (see its own doc comment), so this is where that
 * state actually lives, translated into the native REST `_sort`/`_order`/
 * `_start`/`_end` params. */
export function useAdminList<T>(
  resource: string,
  options: {
    defaultSort?: string
    defaultOrder?: Order
    filter?: Record<string, unknown>
  } = {},
) {
  const [sorting, setSorting] = useState<SortingState>(
    options.defaultSort
      ? [{ id: options.defaultSort, desc: options.defaultOrder === "DESC" }]
      : [],
  )
  const [pagination, setPagination] = useState<DataTablePagination>({
    pageIndex: 0,
    pageSize: 25,
  })

  const sort = sorting[0]?.id
  const order: Order = sorting[0]?.desc ? "DESC" : "ASC"

  const { data, isLoading } = useQuery({
    queryKey: [resource, "admin-list", sort, order, pagination, options.filter],
    queryFn: () =>
      getList<T>(resource, {
        sort,
        order: sort ? order : undefined,
        filter: options.filter,
        start: pagination.pageIndex * pagination.pageSize,
        end: (pagination.pageIndex + 1) * pagination.pageSize,
      }),
  })

  return {
    items: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    sorting,
    setSorting,
    pagination,
    setPagination,
  }
}
