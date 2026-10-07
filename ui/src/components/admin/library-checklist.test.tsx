import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { LibraryChecklist } from "./library-checklist"
import { getList } from "@/lib/api/http"
import type { Library } from "@/lib/api/types"

vi.mock("@/lib/api/http", () => ({
  getList: vi.fn(),
}))

const libraries: Library[] = [
  { id: 1, name: "Music" } as Library,
  { id: 2, name: "Podcasts" } as Library,
]

function Harness() {
  const [selectedIds, setSelectedIds] = useState<number[]>([1])
  return (
    <LibraryChecklist selectedIds={selectedIds} onChange={setSelectedIds} />
  )
}

function renderChecklist() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  )
}

describe("LibraryChecklist", () => {
  it("checks only the initially-selected library", async () => {
    vi.mocked(getList).mockResolvedValue({ data: libraries, total: 2 })
    renderChecklist()

    const music = await screen.findByRole("checkbox", { name: "Music" })
    const podcasts = screen.getByRole("checkbox", { name: "Podcasts" })
    expect(music).toBeChecked()
    expect(podcasts).not.toBeChecked()
  })

  it("toggling one library only affects that one", async () => {
    vi.mocked(getList).mockResolvedValue({ data: libraries, total: 2 })
    renderChecklist()

    const podcasts = await screen.findByRole("checkbox", { name: "Podcasts" })
    fireEvent.click(podcasts)
    await waitFor(() => expect(podcasts).toBeChecked())
    expect(screen.getByRole("checkbox", { name: "Music" })).toBeChecked()
  })

  it("select-all checks every library, and unchecking it clears all", async () => {
    vi.mocked(getList).mockResolvedValue({ data: libraries, total: 2 })
    renderChecklist()

    const selectAll = await screen.findByRole("checkbox", {
      name: "Select all",
    })
    fireEvent.click(selectAll)
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Podcasts" })).toBeChecked(),
    )

    fireEvent.click(selectAll)
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Music" })).not.toBeChecked(),
    )
  })
})
