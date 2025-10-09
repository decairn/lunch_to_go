import { describe, expect, it, vi } from "vitest"
import { loadDemoAccountData, calculateDemoTotals, getDemoAccountsNormalized } from "../demo-data"
import type { NormalizedAccount } from "../accounts"

// Mock the demo data loader
vi.mock("../../data/demo-accounts", () => ({
  loadDemoAccounts: vi.fn()
}))

describe("Demo Data Domain Service", () => {
  const mockAccounts: NormalizedAccount[] = [
    {
      id: "demo-1",
      name: "Test Checking",
      accountType: "Cash",
      type: "asset",
      isAsset: true,
      source: "asset",
      status: "active",
      lastUpdated: null,
      daysSinceUpdate: null,
      primaryCurrencyBalance: 10000,
      accountCurrencyBalance: 10000,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "asset-cash",
    },
    {
      id: "demo-2",
      name: "Test Investment",
      accountType: "Investment",
      type: "asset",
      isAsset: true,
      source: "asset",
      status: "active",
      lastUpdated: null,
      daysSinceUpdate: null,
      primaryCurrencyBalance: 50000,
      accountCurrencyBalance: 50000,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "asset-investment",
    },
    {
      id: "demo-3",
      name: "Test Credit Card",
      accountType: "Credit",
      type: "liability",
      isAsset: false,
      source: "asset",
      status: "active",
      lastUpdated: null,
      daysSinceUpdate: null,
      primaryCurrencyBalance: 2500,
      accountCurrencyBalance: 2500,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "liability-credit",
    }
  ]

  it("loads and groups demo account data correctly", async () => {
    const { loadDemoAccounts } = await import("../../data/demo-accounts")
    vi.mocked(loadDemoAccounts).mockResolvedValue(mockAccounts)

    const result = await loadDemoAccountData("CAD", "alpha")

    expect(result).toHaveLength(2) // Assets and Liabilities groups
    expect(result[0].type).toBe("asset")
    expect(result[0].label).toBe("Assets")
    expect(result[1].type).toBe("liability")
    expect(result[1].label).toBe("Liabilities")
  })

  it("calculates totals correctly", () => {
    const totals = calculateDemoTotals(mockAccounts)

    expect(totals.assets).toBe(60000) // 10000 + 50000
    expect(totals.liabilities).toBe(2500)
    expect(totals.net).toBe(57500) // 60000 - 2500
  })

  it("returns normalized accounts", async () => {
    const { loadDemoAccounts } = await import("../../data/demo-accounts")
    vi.mocked(loadDemoAccounts).mockResolvedValue(mockAccounts)

    const result = await getDemoAccountsNormalized("CAD")

    expect(result).toEqual(mockAccounts)
    expect(loadDemoAccounts).toHaveBeenCalledWith("CAD")
  })

  it("handles errors gracefully", async () => {
    const { loadDemoAccounts } = await import("../../data/demo-accounts")
    vi.mocked(loadDemoAccounts).mockRejectedValue(new Error("Network error"))

    await expect(loadDemoAccountData("CAD")).rejects.toThrow("Network error")
  })
})