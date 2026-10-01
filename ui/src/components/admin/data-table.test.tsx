import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { DataTable, type DataTablePagination } from "./data-table"

interface Row {
  id: number
  name: string
}

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Name" },
]

function Harness({
  data,
  rowCount,
  onSortingChange,
}: {
  data: Row[]
  rowCount: number
  onSortingChange: (sorting: SortingState) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<DataTablePagination>({
    pageIndex: 0,
    pageSize: 10,
  })

  return (
    <DataTable
      columns={columns}
      data={data}
      rowCount={rowCount}
      sorting={sorting}
      onSortingChange={(updater) => {
        const next = typeof updater === "function" ? updater(sorting) : updater
        setSorting(next)
        onSortingChange(next)
      }}
      pagination={pagination}
      onPaginationChange={setPagination}
    />
  )
}

describe("DataTable", () => {
  it("renders rows", () => {
    render(
      <Harness
        data={[
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ]}
        rowCount={2}
        onSortingChange={() => {}}
      />,
    )
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
  })

  it("shows the empty message when there is no data", () => {
    render(<Harness data={[]} rowCount={0} onSortingChange={() => {}} />)
    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  it("toggles sorting when a sortable header is clicked", () => {
    const onSortingChange = vi.fn()
    render(
      <Harness
        data={[{ id: 1, name: "Alice" }]}
        rowCount={1}
        onSortingChange={onSortingChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /name/i }))
    expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: false }])
  })
})
