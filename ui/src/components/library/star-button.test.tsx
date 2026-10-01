import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StarButton } from "./star-button"

vi.mock("@/lib/api/subsonic", () => ({
  star: vi.fn().mockResolvedValue(undefined),
  unstar: vi.fn().mockResolvedValue(undefined),
}))

import { star, unstar } from "@/lib/api/subsonic"

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient()
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe("StarButton", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calls star() and shows the starred state optimistically", async () => {
    renderWithClient(<StarButton resource="album" id="a1" starred={false} />)
    const button = screen.getByRole("button", { name: "Add to favourites" })
    fireEvent.click(button)
    // The starred state flips synchronously (optimistic); the mutationFn
    // call goes through React Query's internal async scheduling.
    expect(
      screen.getByRole("button", { name: "Remove from favourites" }),
    ).toBeInTheDocument()
    await waitFor(() => expect(star).toHaveBeenCalledWith("a1"))
  })

  it("calls unstar() when already starred", async () => {
    renderWithClient(<StarButton resource="album" id="a1" starred={true} />)
    fireEvent.click(
      screen.getByRole("button", { name: "Remove from favourites" }),
    )
    await waitFor(() => expect(unstar).toHaveBeenCalledWith("a1"))
  })
})
