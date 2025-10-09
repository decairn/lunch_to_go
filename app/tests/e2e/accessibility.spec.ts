import { test, expect, type Locator, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

async function focusElement(page: Page, locator: Locator) {
  for (let i = 0; i < 10; i += 1) {
    // Wait for focus to settle
    const isFocused = await locator.evaluate((element) => element === document.activeElement)
    if (isFocused) {
      return
    }
    await page.keyboard.press("Tab")
  }
}

async function expectNoAxeViolations(page: Page) {
  const axe = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude("iframe")
  const results = await axe.analyze()

  if (results.violations.length > 0) {
    console.error("Accessibility violations found:", results.violations)
  }

  expect(results.violations).toEqual([])
}

test.describe("Accessibility & Keyboard Support", () => {
  test("Settings tab passes axe accessibility audit", async ({ page }) => {
    await page.goto("/")
    await expectNoAxeViolations(page)
  })

  test("Accounts demo flow is keyboard accessible and axe-compliant", async ({ page }) => {
    await page.goto("/")

    const settingsTab = page.getByRole("tab", { name: "Settings" })
    await page.keyboard.press("Tab")
    await expect(settingsTab).toBeFocused()

    const accountsTab = page.getByRole("tab", { name: "Accounts" })
    await page.keyboard.press("ArrowRight")
    await expect(accountsTab).toBeFocused()
    await page.keyboard.press("Enter")

    const showDemoButton = page.getByRole("button", { name: "Show Demo Data" })
    await expect(showDemoButton).toBeVisible()

    await focusElement(page, showDemoButton)
    await expect(showDemoButton).toBeFocused()
    await page.keyboard.press("Enter")

    const demoBadge = page.locator('[data-slot="badge"]', { hasText: "Demo Data" })
    await expect(demoBadge).toBeVisible()

    await expectNoAxeViolations(page)
  })
})
