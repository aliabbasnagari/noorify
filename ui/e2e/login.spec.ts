import { test, expect } from "@playwright/test"

test("shows the login form to an unauthenticated visitor", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Navidrome" })).toBeVisible()
  await expect(page.getByRole("button", { name: /log in/i })).toBeVisible()
})
