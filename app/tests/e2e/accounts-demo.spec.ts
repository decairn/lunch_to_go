import { test, expect } from "@playwright/test"

test.describe("Accounts demo mode", () => {
  test("disconnected user can preview accounts using demo data", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("tab", { name: "Settings" })).toHaveAttribute("data-state", "active")

    const accountsTab = page.getByRole("tab", { name: "Accounts" })
    await accountsTab.click()

    const showDemoButton = page.getByRole("button", { name: "Show Demo Data" })
    await expect(showDemoButton).toBeVisible()

    await showDemoButton.click()

    const demoBadge = page.locator('[data-slot="badge"]', { hasText: "Demo Data" })
    await expect(demoBadge).toBeVisible()

    await expect(page.locator('[data-slot="card-title"]', { hasText: "Net Worth" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Liabilities" })).toBeVisible()
    await expect(page.getByText("Joint BCB Chequing")).toBeVisible()

    const exitDemoButton = page.getByRole("button", { name: "Exit Demo" })
    await expect(exitDemoButton).toBeVisible()
    await exitDemoButton.click()

    await expect(page.getByRole("button", { name: "Show Demo Data" })).toBeVisible()
  })
})
