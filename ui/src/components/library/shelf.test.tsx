import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Shelf } from './shelf'

describe('Shelf', () => {
  it('renders a skeleton row while loading', () => {
    render(
      <Shelf
        title="Recently Added"
        items={[]}
        isLoading
        renderItem={() => null}
      />,
    )
    expect(screen.getByText('Recently Added')).toBeInTheDocument()
  })

  it('renders nothing once loaded with no items', () => {
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

  it('renders each item that fits the row', () => {
    render(
      <Shelf
        title="Random Picks"
        items={[{ id: '1' }, { id: '2' }]}
        isLoading={false}
        renderItem={(item) => <span>Item {item.id}</span>}
      />,
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it("renders only one row's worth of items", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }))
    render(
      <Shelf
        title="Recently Added"
        items={items}
        isLoading={false}
        renderItem={(item) => <span>Item {item.id}</span>}
      />,
    )
    // Fallback column count (no layout in jsdom) — far fewer than all 20.
    expect(screen.getAllByText(/^Item /).length).toBeLessThan(20)
  })

  it('renders the header action', () => {
    render(
      <Shelf
        title="Recently Added"
        items={[{ id: '1' }]}
        isLoading={false}
        renderItem={() => <span>Item</span>}
        action={<a href="/x">Show all</a>}
      />,
    )
    expect(screen.getByText('Show all')).toBeInTheDocument()
  })
})
