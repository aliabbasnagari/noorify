import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RatingStars } from "./rating-stars"

vi.mock("@/lib/api/subsonic", () => ({
  setRating: vi.fn().mockResolvedValue(undefined),
}))

import { setRating } from "@/lib/api/subsonic"

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient()
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe("RatingStars", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sets the clicked rating", async () => {
    renderWithClient(<RatingStars resource="album" id="a1" rating={0} />)
    fireEvent.click(screen.getByRole("button", { name: "Rate 3 stars" }))
    await waitFor(() => expect(setRating).toHaveBeenCalledWith("a1", 3))
  })

  it("clears the rating when clicking the currently-set value", async () => {
    renderWithClient(<RatingStars resource="album" id="a1" rating={3} />)
    fireEvent.click(screen.getByRole("button", { name: "Rate 3 stars" }))
    await waitFor(() => expect(setRating).toHaveBeenCalledWith("a1", 0))
  })
})
