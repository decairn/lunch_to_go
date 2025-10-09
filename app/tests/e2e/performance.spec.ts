import { test, expect } from "@playwright/test"

async function waitForMeasurement(page, name: string) {
  return page.evaluate(
    (entryName) =>
      new Promise<number>((resolve) => {
        const existing = performance.getEntriesByName(entryName).pop()
        if (existing) {
          resolve(existing.duration)
          return
        }

        const observer = new PerformanceObserver((list, obs) => {
          const entries = list.getEntriesByName(entryName)
          if (entries.length > 0) {
            obs.disconnect()
            resolve(entries[entries.length - 1].duration)
          }
        })

        observer.observe({ entryTypes: ["measure"] })
      }),
    name,
  )
}

test.describe("Performance", () => {
  test("Demo accounts load completes under 2 seconds", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("tab", { name: "Accounts" }).click()
    await page.getByRole("button", { name: "Show Demo Data" }).click()

    const duration = await waitForMeasurement(page, "accounts-data-load")
    expect(duration).toBeLessThan(2000)
  })
})
