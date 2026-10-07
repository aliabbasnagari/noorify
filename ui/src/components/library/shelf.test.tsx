import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { Shelf } from "./shelf"

// jsdom always reports 0 for scrollWidth/clientWidth (no real layout), so
// the shelf's scroll-chaining boundary check (`atStart`/`atEnd`) needs
// these overridden per test to simulate "still has room to scroll" vs "hit
// the edge".
function mockScrollMetrics(
  el: HTMLElement,
  { scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number },
) {
  Object.defineProperty(el, "scrollWidth", {
    value: scrollWidth,
    configurable: true,
  })
  Object.defineProperty(el, "clientWidth", {
    value: clientWidth,
    configurable: true,
  })
}

function renderShelf() {
  const { container } = render(
    <Shelf
      title="Recently Added"
      items={[{ id: "1" }]}
      isLoading={false}
      renderItem={() => <span>Item</span>}
    />,
  )
  return container.querySelector(".overflow-x-auto") as HTMLElement
}

describe("Shelf", () => {
  it("renders a skeleton row while loading", () => {
    render(
      <Shelf
        title="Recently Added"
        items={[]}
        isLoading
        renderItem={() => null}
      />,
    )
    expect(screen.getByText("Recently Added")).toBeInTheDocument()
  })

  it("renders nothing once loaded with no items", () => {
    const { container } = render(
      <Shelf
        title="Favorites"
        items={[]}
        isLoading={false}
        renderItem={() => null}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("renders each item", () => {
    render(
      <Shelf
        title="Random Picks"
        items={[{ id: "1" }, { id: "2" }]}
        isLoading={false}
        renderItem={(item) => <span>Item {item.id}</span>}
      />,
    )
    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  // Real drag-to-scroll (pointer capture) and jsdom don't mix — same
  // "verify in e2e, not unit tests" limitation as the dnd-kit playlist
  // reorder — so only the wheel-conversion arithmetic is covered here.
  it("converts a dominant vertical wheel gesture into horizontal scroll", () => {
    const scroller = renderShelf()
    mockScrollMetrics(scroller, { scrollWidth: 1000, clientWidth: 300 })
    scroller.scrollLeft = 100
    fireEvent.wheel(scroller, { deltaY: 40, deltaX: 0 })
    expect(scroller.scrollLeft).toBe(140)
  })

  it("leaves scroll alone for a dominant horizontal gesture (native scroll handles it)", () => {
    const scroller = renderShelf()
    mockScrollMetrics(scroller, { scrollWidth: 1000, clientWidth: 300 })
    scroller.scrollLeft = 100
    fireEvent.wheel(scroller, { deltaY: 5, deltaX: 40 })
    expect(scroller.scrollLeft).toBe(100)
  })

  it("stops converting once scrolled all the way to the end, so the page can scroll vertically", () => {
    const scroller = renderShelf()
    mockScrollMetrics(scroller, { scrollWidth: 1000, clientWidth: 300 })
    scroller.scrollLeft = 700 // scrollWidth - clientWidth: fully scrolled right
    fireEvent.wheel(scroller, { deltaY: 40, deltaX: 0 })
    expect(scroller.scrollLeft).toBe(700)
  })

  it("stops converting at the start when scrolling backward, so the page can scroll vertically", () => {
    const scroller = renderShelf()
    mockScrollMetrics(scroller, { scrollWidth: 1000, clientWidth: 300 })
    scroller.scrollLeft = 0
    fireEvent.wheel(scroller, { deltaY: -40, deltaX: 0 })
    expect(scroller.scrollLeft).toBe(0)
  })

  it("resumes converting once scrolling back away from the end", () => {
    const scroller = renderShelf()
    mockScrollMetrics(scroller, { scrollWidth: 1000, clientWidth: 300 })
    scroller.scrollLeft = 700
    fireEvent.wheel(scroller, { deltaY: -40, deltaX: 0 })
    expect(scroller.scrollLeft).toBe(660)
  })
})
