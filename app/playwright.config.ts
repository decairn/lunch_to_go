import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

const webBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { outputFolder: "playwright-report" }]] : "list",
  use: {
    baseURL: webBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3000",
    url: webBaseUrl,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    cwd: path.resolve(__dirname),
  },
  projects: [
    {
      name: "web-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "desktop-webview2",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
