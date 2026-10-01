import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { VirtualizedGrid } from "./virtualized-grid"

// jsdom doesn't do real layout (no scroll/clientHeight), so this only
// covers the empty-state and basic-render paths. The actual windowing
// (only a bounded subset of rows in the DOM) and infinite-scroll pagination
// are verified against real layout in e2e/albums.spec.ts.
describe("VirtualizedGrid", () => {
  it("shows the empty message when total is 0", () => {
    render(
      <VirtualizedGrid
        items={[]}
        total={0}
        itemMinWidth={100}
        itemHeight={100}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
        renderItem={(item) => <div>{String(item)}</div>}
        emptyMessage="Nothing here yet."
      />,
    )
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument()
  })

  it("sizes the scroll spacer for the full row count without crashing", () => {
    // jsdom's scroll container always measures 0×0 (no real layout), so
    // the virtualizer sees no rows "in view" and renders none of them —
    // real windowing (a bounded subset of rows in the DOM) and infinite
    // scroll are verified against real layout in e2e/albums.spec.ts. This
    // just proves the total-size math (5 rows of 2 at 116px each) and that
    // it doesn't throw.
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }))
    const { container } = render(
      <VirtualizedGrid
        items={items}
        total={items.length}
        itemMinWidth={100}
        itemHeight={100}
        gap={16}
        columns={2}
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={vi.fn()}
        renderItem={(item) => <div key={item.id}>Item {item.id}</div>}
      />,
    )
    const spacer = container.querySelector('[style*="position: relative"]')
    expect(spacer).toHaveStyle({ height: "580px" })
  })
})
