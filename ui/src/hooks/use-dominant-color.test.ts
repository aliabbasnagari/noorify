import { describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useDominantColor } from "./use-dominant-color"

vi.mock("@/lib/color-extraction", () => ({
  extractDominantColor: vi.fn((url: string) =>
    Promise.resolve(url ? `color-for-${url}` : null),
  ),
}))

describe("useDominantColor", () => {
  it("resolves the extracted color", async () => {
    const { result } = renderHook(() => useDominantColor("a.jpg"))
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe("color-for-a.jpg"))
  })

  it("resets to null immediately when the url changes, before the new color resolves", async () => {
    const { result, rerender } = renderHook(
      ({ url }: { url: string | null }) => useDominantColor(url),
      { initialProps: { url: "a.jpg" } },
    )
    await waitFor(() => expect(result.current).toBe("color-for-a.jpg"))

    rerender({ url: "b.jpg" })
    // Synchronous render-time reset — must not still show "a.jpg"'s color.
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe("color-for-b.jpg"))
  })

  it("returns null for a null url", () => {
    const { result } = renderHook(() => useDominantColor(null))
    expect(result.current).toBeNull()
  })
})
