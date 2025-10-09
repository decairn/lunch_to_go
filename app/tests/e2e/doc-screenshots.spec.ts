import { test, expect } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"

const screenshotsDir = path.resolve(__dirname, "../../..", "docs", "images")
const shouldCapture = process.env.CAPTURE_SCREENSHOTS === "1"

test.describe("documentation screenshots", () => {
  test.skip(!shouldCapture, "Set CAPTURE_SCREENSHOTS=1 to refresh documentation imagery.")

  test("capture settings and demo accounts views", async ({ page }) => {
    await fs.mkdir(screenshotsDir, { recursive: true })

    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Settings")).toBeVisible()

    const settingsScreenshotPath = path.join(screenshotsDir, "settings-view.png")
    await page.screenshot({ path: settingsScreenshotPath, fullPage: true })

    await page.getByRole("tab", { name: /accounts/i }).click()
    await page.waitForSelector("text=Show Demo Data", { state: "visible" })

    await page.getByRole("button", { name: /show demo data/i }).click()
    await page.waitForSelector("text=Demo Data", { state: "visible" })
    await page.waitForSelector("text=Accounts overview", { state: "visible" })
    await page.waitForSelector("text=Net Worth", { state: "visible" })

    const accountsScreenshotPath = path.join(screenshotsDir, "accounts-view.png")
    await page.waitForTimeout(500)
    await page.screenshot({ path: accountsScreenshotPath, fullPage: true })
  })
})
