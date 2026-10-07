import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAdminList } from "./use-admin-list"
import { getList } from "@/lib/api/http"

vi.mock("@/lib/api/http", () => ({
  getList: vi.fn().mockResolvedValue({ data: [{ id: 1 }], total: 1 }),
}))

function renderWithClient<T>(
  resource: string,
  options?: Parameters<typeof useAdminList>[1],
) {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useAdminList<T>(resource, options), { wrapper })
}

describe("useAdminList", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fetches with the given default sort/order and first page", async () => {
    renderWithClient("user", { defaultSort: "userName", defaultOrder: "ASC" })
    await waitFor(() =>
      expect(getList).toHaveBeenCalledWith("user", {
        sort: "userName",
        order: "ASC",
        filter: undefined,
        start: 0,
        end: 25,
      }),
    )
  })

  it("omits sort/order entirely when no column is sorted", async () => {
    renderWithClient("player")
    await waitFor(() =>
      expect(getList).toHaveBeenCalledWith("player", {
        sort: undefined,
        order: undefined,
        filter: undefined,
        start: 0,
        end: 25,
      }),
    )
  })

  it("translates pagination state into start/end offsets", async () => {
    const { result } = renderWithClient<{ id: number }>("library")
    await waitFor(() => expect(result.current.total).toBe(1))

    act(() => {
      result.current.setPagination({ pageIndex: 2, pageSize: 10 })
    })

    await waitFor(() =>
      expect(getList).toHaveBeenCalledWith(
        "library",
        expect.objectContaining({ start: 20, end: 30 }),
      ),
    )
  })

  it("passes a static filter through unchanged", async () => {
    renderWithClient("player", { filter: { userId: "abc" } })
    await waitFor(() =>
      expect(getList).toHaveBeenCalledWith(
        "player",
        expect.objectContaining({ filter: { userId: "abc" } }),
      ),
    )
  })
})
