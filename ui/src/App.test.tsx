import { describe, expect, it, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "./App"

describe("App", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("redirects an unauthenticated visitor to the login page", async () => {
    render(<App />)
    expect(
      await screen.findByRole("button", { name: /log in/i }),
    ).toBeInTheDocument()
  })
})
