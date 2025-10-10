import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

vi.mock("@/lib/api/platform", () => ({
  isDesktopApp: vi.fn(),
}))

vi.mock("@/lib/telemetry", () => ({
  logWarningEvent: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"
import { isDesktopApp } from "@/lib/api/platform"
import { logWarningEvent } from "@/lib/telemetry"
import { openLunchMoneyAccountsPage } from "../navigation"

const invokeMock = vi.mocked(invoke)
const isDesktopAppMock = vi.mocked(isDesktopApp)
const logWarningEventMock = vi.mocked(logWarningEvent)

describe("openLunchMoneyAccountsPage", () => {
  beforeEach(() => {
    invokeMock.mockReset()
    isDesktopAppMock.mockReset()
    logWarningEventMock.mockReset()
    ;(global as unknown as { window: unknown }).window = {
      open: vi.fn(),
      location: { href: "" },
    }
  })

  it("opens a new browser tab in web environments", async () => {
    const windowRef = global as unknown as { window: { open: ReturnType<typeof vi.fn>; __TAURI__?: unknown } }
    invokeMock.mockRejectedValue(new Error("not available"))
    isDesktopAppMock.mockReturnValue(false)

    await openLunchMoneyAccountsPage()

    expect(invokeMock).toHaveBeenCalledWith("open_lunch_money_accounts")
    expect(windowRef.window.open).toHaveBeenCalledWith(
      "https://my.lunchmoney.app/accounts",
      "_blank",
      "noopener,noreferrer",
    )
  })

  it("uses Tauri invoke when running on desktop", async () => {
    isDesktopAppMock.mockReturnValue(true)
    invokeMock.mockResolvedValue(undefined)

    await openLunchMoneyAccountsPage()

    expect(invokeMock).toHaveBeenCalledWith("open_lunch_money_accounts")
    expect(logWarningEventMock).not.toHaveBeenCalled()
  })

  it("falls back to window.open when Tauri invoke fails", async () => {
    isDesktopAppMock.mockReturnValue(true)
    invokeMock.mockRejectedValue(new Error("shell unavailable"))
    const windowRef = global as unknown as {
      window: {
        open: ReturnType<typeof vi.fn>
        location: { href: string }
        __TAURI__?: unknown
      }
    }
    windowRef.window = {
      open: vi.fn(),
      location: { href: "" },
    }

    await openLunchMoneyAccountsPage()

    expect(invokeMock).toHaveBeenCalledWith("open_lunch_money_accounts")
    expect(windowRef.window.open).toHaveBeenCalledWith(
      "https://my.lunchmoney.app/accounts",
      "_blank",
      "noopener,noreferrer",
    )
    expect(logWarningEventMock).toHaveBeenCalledWith("open-lunch-money-accounts-fallback", {
      error: "shell unavailable",
    })
  })
})
