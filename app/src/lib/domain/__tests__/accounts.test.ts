import { describe, expect, it } from "vitest"
import type { AssetResource, PlaidAccountResource } from "@/lib/api"
import { normalizeAccounts, formatDaysSinceUpdate, getAccountIcon, groupAccountsByTypeAndAccountType } from "../accounts"

describe("normalizeAccounts", () => {
  it("normalizes asset and plaid accounts into a unified list", () => {
    const asset: AssetResource = {
      id: 1,
      name: "Emergency Savings",
      display_name: null,
      type_name: "Cash",
      subtype_name: "Savings",
      institution_name: "Acme Credit Union",
      status: "active",
      is_manual: true,
      is_liability: false,
      balance: "1200.5",
      to_base: 1200.5,
      currency: "usd",
      last_autosync: "2025-09-30T10:00:00Z",
      updated_at: "2025-09-29T12:00:00Z",
    }

    const plaid: PlaidAccountResource = {
      id: "plaid-1",
      name: "Everyday Visa",
      display_name: "Visa Platinum",
      mask: "1234",
      type: "credit",
      subtype: "Credit Card",
      institution_name: "Acme Bank",
      status: "inactive",
      balance: "200.5",
      to_base: 210.75,
      currency: "cad",
      last_autosync: "2025-09-29T08:35:00Z",
    }

    const result = normalizeAccounts({
      assets: [asset],
      plaidAccounts: [plaid],
      primaryCurrency: "usd",
    })

    expect(result).toHaveLength(2)

    const normalizedAsset = result.find((item) => item.source === "asset")
    const normalizedPlaid = result.find((item) => item.source === "plaid")

    expect(normalizedAsset).toMatchObject({
      id: "1",
      name: "Emergency Savings",
      accountType: "Cash",
      type: "asset",
      isAsset: true,
      primaryCurrencyBalance: 1200.5,
      accountCurrencyBalance: 1200.5,
      primaryCurrencyCode: "USD",
      accountCurrencyCode: "USD",
      institutionName: "Acme Credit Union",
      status: "active",
      iconKey: "asset-cash",
    })
    expect(normalizedAsset?.lastUpdated).toBe("2025-09-30T10:00:00.000Z")

    expect(normalizedPlaid).toMatchObject({
      id: "plaid-1",
      name: "Visa Platinum",
      accountType: "credit",
      type: "liability",
      isAsset: false,
      primaryCurrencyBalance: 210.75,
      accountCurrencyBalance: 200.5,
      primaryCurrencyCode: "USD",
      accountCurrencyCode: "CAD",
      institutionName: "Acme Bank",
      status: "inactive",
      iconKey: "liability-credit",
    })
    expect(normalizedPlaid?.lastUpdated).toBe("2025-09-29T08:35:00.000Z")
  })

  it("handles foreign currency accounts with currency field", () => {
    const cadAsset: AssetResource = {
      id: "rbc-savings",
      name: "RBC CAD Savings",
      display_name: null,
      type_name: "checking",
      subtype_name: null,
      institution_name: "RBC",
      status: "active",
      is_manual: false,
      is_liability: false,
      balance: "5000.00",
      to_base: 3500.00, // USD equivalent
      currency: "CAD",
      last_autosync: "2025-01-01T10:00:00Z",
      updated_at: null,
    }

    const [normalized] = normalizeAccounts({
      assets: [cadAsset],
      primaryCurrency: "USD",
    })

    // Should use currency field directly
    expect(normalized).toMatchObject({
      accountCurrencyCode: "CAD",
      accountCurrencyBalance: 5000.00,
      primaryCurrencyBalance: 3500.00, // Uses to_base for primary currency
      primaryCurrencyCode: "USD",
    })
  })

  it("falls back to account balance and handles liabilities for assets", () => {
    const liabilityAsset: AssetResource = {
      id: "loan-1",
      name: "Car Loan",
      display_name: null,
      type_name: "Loan",
      subtype_name: null,
      institution_name: null,
      status: "open",
      is_manual: false,
      is_liability: true,
      balance: "10000.25",
      to_base: null,
      currency: "usd",
      last_autosync: null,
      updated_at: null,
    }

    const [normalized] = normalizeAccounts({
      assets: [liabilityAsset],
      primaryCurrency: "usd",
    })

    expect(normalized).toMatchObject({
      id: "loan-1",
      name: "Car Loan",
      accountType: "Loan",
      type: "liability",
      isAsset: false,
      primaryCurrencyBalance: 10000.25,
      accountCurrencyBalance: 10000.25,
      accountCurrencyCode: "USD",
      iconKey: "liability-loan",
    })
    expect(normalized.lastUpdated).toBeNull()
  })

  it("correctly uses to_base field for currency conversion", () => {
    const usdAsset: AssetResource = {
      id: 123,
      name: "USD Checking",
      display_name: "Wells Fargo USD",
      type_name: "checking",
      subtype_name: null,
      institution_name: "Wells Fargo",
      status: "active", 
      is_manual: false,
      is_liability: false,
      balance: "34267.64", // USD account balance
      to_base: 47772.69, // CAD primary currency equivalent
      currency: "USD",
      last_autosync: "2025-01-01T10:00:00Z",
      updated_at: null,
    }

    const usdPlaid: PlaidAccountResource = {
      id: 456,
      name: "ADP 401k",
      display_name: "Keith ADP 401k",
      mask: "0001",
      type: "depository",
      accountType: "savings",
      institution_name: "ADP",
      status: "active",
      balance: "0", // USD balance
      to_base: 0, // CAD equivalent 
      currency: "USD",
      last_autosync: "2025-01-01T08:00:00Z",
    }

    const result = normalizeAccounts({
      assets: [usdAsset],
      plaidAccounts: [usdPlaid],
      primaryCurrency: "CAD",
    })

    expect(result).toHaveLength(2)

    const normalizedAsset = result.find((item) => item.source === "asset")
    const normalizedPlaid = result.find((item) => item.source === "plaid")

    // Asset should use to_base for primary currency balance
    expect(normalizedAsset).toMatchObject({
      id: "123",
      name: "Wells Fargo USD", 
      accountCurrencyBalance: 34267.64, // USD amount from balance
      primaryCurrencyBalance: 47772.69, // CAD amount from to_base
      accountCurrencyCode: "USD",
      primaryCurrencyCode: "CAD",
    })

    // Plaid should also use to_base for primary currency balance
    expect(normalizedPlaid).toMatchObject({
      id: "456",
      name: "Keith ADP 401k",
      accountCurrencyBalance: 0, // USD amount from balance
      primaryCurrencyBalance: 0, // CAD amount from to_base
      accountCurrencyCode: "USD", 
      primaryCurrencyCode: "CAD",
    })
  })

  it("falls back to account balance when to_base is missing", () => {
    const cadAsset: AssetResource = {
      id: 789,
      name: "CAD Savings",
      display_name: null,
      type_name: "savings",
      subtype_name: null,
      institution_name: "RBC",
      status: "active",
      is_manual: true,
      is_liability: false,
      balance: "5000.00",
      // to_base field missing - should fall back to balance
      currency: "CAD",
      last_autosync: null,
      updated_at: "2025-01-01T12:00:00Z",
    }

    const [normalized] = normalizeAccounts({
      assets: [cadAsset],
      primaryCurrency: "CAD",
    })

    expect(normalized).toMatchObject({
      id: "789",
      name: "CAD Savings",
      accountCurrencyBalance: 5000.00,
      primaryCurrencyBalance: 5000.00, // Should fall back to account balance
      accountCurrencyCode: "CAD",
      primaryCurrencyCode: "CAD",
    })
  })

  it("handles missing currency field by using primary currency", () => {
    const assetWithoutCurrency: AssetResource = {
      id: 999,
      name: "Legacy Account",
      display_name: null,
      type_name: "checking",
      subtype_name: null,
      institution_name: "Legacy Bank",
      status: "active",
      is_manual: true,
      is_liability: false,
      balance: "1000.00",
      to_base: 1000.00,
      // currency field missing
      last_autosync: null,
      updated_at: null,
    }

    const [normalized] = normalizeAccounts({
      assets: [assetWithoutCurrency],
      primaryCurrency: "USD",
    })

    expect(normalized).toMatchObject({
      id: "999",
      name: "Legacy Account",
      accountCurrencyCode: "USD", // Should fall back to primary currency
      primaryCurrencyCode: "USD",
      accountCurrencyBalance: 1000.00,
      primaryCurrencyBalance: 1000.00,
    })
  })

  it("calculates days since update correctly", () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    const assetWithUpdate: AssetResource = {
      id: 888,
      name: "Recent Account",
      display_name: null,
      type_name: "checking",
      subtype_name: null,
      institution_name: "Test Bank",
      status: "active",
      is_manual: false,
      is_liability: false,
      balance: "500.00",
      to_base: 500.00,
      currency: "USD",
      last_autosync: threeDaysAgo.toISOString(),
      updated_at: null,
    }

    const [normalized] = normalizeAccounts({
      assets: [assetWithUpdate],
      primaryCurrency: "USD",
    })

    expect(normalized.daysSinceUpdate).toBe(3)
    expect(normalized.lastUpdated).toBe(threeDaysAgo.toISOString())
  })

  it("handles missing last updated date", () => {
    const assetWithoutUpdate: AssetResource = {
      id: 777,
      name: "No Update Account",
      display_name: null,
      type_name: "checking",
      subtype_name: null,
      institution_name: "Test Bank",
      status: "active",
      is_manual: false,
      is_liability: false,
      balance: "500.00",
      to_base: 500.00,
      currency: "USD",
      last_autosync: null,
      updated_at: null,
    }

    const [normalized] = normalizeAccounts({
      assets: [assetWithoutUpdate],
      primaryCurrency: "USD",
    })

    expect(normalized.daysSinceUpdate).toBe(null)
    expect(normalized.lastUpdated).toBe(null)
  })

  it("filters out closed accounts from both assets and plaid accounts", () => {
    const activeAsset: AssetResource = {
      id: 1,
      name: "Active Asset",
      type_name: "Cash",
      subtype_name: "Checking",
      status: "active",
      balance: "1000",
      currency: "usd",
    }

    const closedAsset: AssetResource = {
      id: 2,
      name: "Closed Asset",
      type_name: "Cash", 
      subtype_name: "Savings",
      status: "closed",
      balance: "500",
      currency: "usd",
    }

    const activePlaid: PlaidAccountResource = {
      id: "plaid-active",
      name: "Active Plaid",
      type: "depository",
      accountType: "checking",
      status: "active",
      balance: "2000",
      currency: "usd",
    }

    const closedPlaid: PlaidAccountResource = {
      id: "plaid-closed", 
      name: "Closed Plaid",
      type: "credit",
      accountType: "credit card",
      status: "closed",
      balance: "100",
      currency: "usd",
    }

    const result = normalizeAccounts({
      assets: [activeAsset, closedAsset],
      plaidAccounts: [activePlaid, closedPlaid],
      primaryCurrency: "USD",
    })

    // Should only return the 2 active accounts
    expect(result).toHaveLength(2)
    expect(result.map(acc => acc.name)).toEqual(["Active Asset", "Active Plaid"])
    expect(result.every(acc => acc.status !== "closed")).toBe(true)
  })

  it("returns empty array when no accounts are provided", () => {
    const result = normalizeAccounts({
      assets: [],
      plaidAccounts: [],
      primaryCurrency: "usd",
    })

    expect(result).toEqual([])

    const grouped = groupAccountsByTypeAndAccountType(result, "alpha")
    expect(grouped).toEqual([])
  })

  it("groups liabilities correctly when all inputs are liabilities", () => {
    const liabilityAsset: AssetResource = {
      id: 99,
      name: "Auto Loan",
      display_name: null,
      type_name: "Loan",
      subtype_name: null,
      institution_name: "Auto Finance Co",
      status: "active",
      is_manual: false,
      is_liability: true,
      balance: "9000.00",
      to_base: 9000.0,
      currency: "USD",
      last_autosync: "2025-09-01T10:00:00Z",
      updated_at: null,
    }

    const plaidLiability: PlaidAccountResource = {
      id: "plaid-credit-9",
      name: "Rewards Visa",
      display_name: null,
      mask: "4321",
      type: "credit",
      subtype: "Credit Card",
      institution_name: "Rewards Bank",
      status: "active",
      balance: "1200.00",
      to_base: 1200.0,
      currency: "usd",
      last_autosync: "2025-09-01T08:00:00Z",
    }

    const result = normalizeAccounts({
      assets: [liabilityAsset],
      plaidAccounts: [plaidLiability],
      primaryCurrency: "usd",
    })

    expect(result).toHaveLength(2)
    result.forEach((account) => {
      expect(account.isAsset).toBe(false)
      expect(account.type).toBe("liability")
    })

    const grouped = groupAccountsByTypeAndAccountType(result, "balance")
    expect(grouped).toHaveLength(1)
    expect(grouped[0].type).toBe("liability")
    expect(grouped[0].label).toBe("Liabilities")

    const accountTypeLabels = grouped[0].accountTypeGroups.map((group) => group.accountType)
    expect(accountTypeLabels).toContain("Loan")
    expect(accountTypeLabels).toContain("credit")
  })

  it("normalizes mixed currency variance between account and primary currency", () => {
    const cadAsset: AssetResource = {
      id: "cad-asset",
      name: "Canadian Savings",
      display_name: null,
      type_name: "Savings",
      subtype_name: null,
      institution_name: "RBC",
      status: "active",
      is_manual: false,
      is_liability: false,
      balance: "500.00",
      to_base: 375.0,
      currency: "cad",
      last_autosync: "2025-08-01T12:00:00Z",
      updated_at: null,
    }

    const plaidAccount: PlaidAccountResource = {
      id: "usd-plaid",
      name: "US Brokerage",
      display_name: "Brokerage USD",
      mask: "9876",
      type: "investment",
      subtype: "brokerage",
      institution_name: "Big US Broker",
      status: "active",
      balance: "250.00",
      to_base: 250.0,
      currency: undefined,
      last_autosync: "2025-08-01T09:30:00Z",
    }

    const result = normalizeAccounts({
      assets: [cadAsset],
      plaidAccounts: [plaidAccount],
      primaryCurrency: "usd",
    })

    expect(result).toHaveLength(2)

    const normalizedCad = result.find((account) => account.id === "cad-asset")
    const normalizedUsd = result.find((account) => account.id === "usd-plaid")

    expect(normalizedCad).toMatchObject({
      accountCurrencyCode: "CAD",
      accountCurrencyBalance: 500,
      primaryCurrencyCode: "USD",
      primaryCurrencyBalance: 375,
    })

    expect(normalizedUsd).toMatchObject({
      accountCurrencyCode: "USD",
      accountCurrencyBalance: 250,
      primaryCurrencyCode: "USD",
      primaryCurrencyBalance: 250,
    })
  })
})

describe("formatDaysSinceUpdate", () => {
  it("formats days correctly", () => {
    expect(formatDaysSinceUpdate(null)).toBe("Unknown")
    expect(formatDaysSinceUpdate(0)).toBe("Updated today")
    expect(formatDaysSinceUpdate(1)).toBe("Updated 1 day ago")
    expect(formatDaysSinceUpdate(3)).toBe("Updated 3 days ago")
    expect(formatDaysSinceUpdate(30)).toBe("Updated 30 days ago")
  })
})

describe("getAccountIcon", () => {
  it("returns correct icons for account types", () => {
    expect(getAccountIcon("asset-checking")).toBe("🏦")
    expect(getAccountIcon("asset-savings")).toBe("💰")
    expect(getAccountIcon("liability-credit-card")).toBe("💳")
    expect(getAccountIcon("liability-mortgage")).toBe("🏠")
    expect(getAccountIcon("asset-real-estate")).toBe("🏠")
  })

  it("falls back to type icon for unknown account types", () => {
    expect(getAccountIcon("asset-unknown")).toBe("💰")
    expect(getAccountIcon("liability-unknown")).toBe("💳")
  })

  it("returns default icon for completely unknown types", () => {
    expect(getAccountIcon("unknown-unknown")).toBe("📄")
  })
})

describe("Plaid depository account type override", () => {
  it("overrides Plaid depository account types and treats them as Cash", () => {
    const depositoryAccount: PlaidAccountResource = {
      id: "depository-1",
      name: "Bank of America Checking",
      display_name: "BOA Checking",
      mask: "5678",
      type: "depository",
      subtype: "checking",
      institution_name: "Bank of America",
      status: "active",
      balance: "1500.00",
      to_base: 1500.00,
      currency: "USD",
      last_autosync: "2025-01-15T10:00:00Z",
    }

    const result = normalizeAccounts({
      assets: [],
      plaidAccounts: [depositoryAccount],
      primaryCurrency: "USD",
    })

    expect(result).toHaveLength(1)
    
    const normalizedAccount = result[0]
    expect(normalizedAccount.accountType).toBe("Cash")
    expect(normalizedAccount.source).toBe("plaid")
    expect(normalizedAccount.type).toBe("asset") // Still classified as asset
    expect(normalizedAccount.iconKey).toBe("asset-cash")
  })

  it("does not override non-depository Plaid account types", () => {
    const creditAccount: PlaidAccountResource = {
      id: "credit-1",
      name: "Chase Credit Card",
      display_name: "Chase Sapphire",
      mask: "9999",
      type: "credit",
      subtype: "credit card",
      institution_name: "Chase",
      status: "active",
      balance: "-250.00",
      to_base: -250.00,
      currency: "USD",
      last_autosync: "2025-01-15T10:00:00Z",
    }

    const result = normalizeAccounts({
      assets: [],
      plaidAccounts: [creditAccount],
      primaryCurrency: "USD",
    })

    expect(result).toHaveLength(1)
    
    const normalizedAccount = result[0]
    expect(normalizedAccount.accountType).toBe("credit") // Keeps original type
    expect(normalizedAccount.source).toBe("plaid")
    expect(normalizedAccount.type).toBe("liability") // Credit is liability
    expect(normalizedAccount.iconKey).toBe("liability-credit")
  })

  it("handles case-insensitive depository type matching", () => {
    const depositoryAccount: PlaidAccountResource = {
      id: "depository-2",
      name: "Wells Fargo Savings",
      display_name: "WF Savings",
      mask: "1111",
      type: "DEPOSITORY", // Uppercase
      subtype: "savings",
      institution_name: "Wells Fargo",
      status: "active",
      balance: "5000.00",
      to_base: 5000.00,
      currency: "USD",
      last_autosync: "2025-01-15T10:00:00Z",
    }

    const result = normalizeAccounts({
      assets: [],
      plaidAccounts: [depositoryAccount],
      primaryCurrency: "USD",
    })

    expect(result).toHaveLength(1)
    
    const normalizedAccount = result[0]
    expect(normalizedAccount.accountType).toBe("Cash")
    expect(normalizedAccount.iconKey).toBe("asset-cash")
  })

  it("groups all cash-like accounts together (Asset cash + Plaid depository/savings/checking)", () => {
    const cashAsset: AssetResource = {
      id: 1,
      name: "Emergency Fund",
      display_name: null,
      type_name: "Cash", // Asset with type_name "Cash"
      subtype_name: null,
      institution_name: "Local Bank",
      status: "active",
      is_manual: true,
      is_liability: false,
      balance: "1000.00",
      to_base: 1000.00,
      currency: "USD",
      last_autosync: "2025-10-01T10:00:00Z",
      updated_at: "2025-10-01T12:00:00Z",
    }

    const savingsAsset: AssetResource = {
      id: 2,
      name: "High Yield Savings",
      display_name: null,
      type_name: "savings", // Asset with type_name "savings" 
      subtype_name: null,
      institution_name: "Online Bank",
      status: "active",
      is_manual: true,
      is_liability: false,
      balance: "5000.00",
      to_base: 5000.00,
      currency: "USD",
      last_autosync: "2025-10-01T10:00:00Z",
      updated_at: "2025-10-01T12:00:00Z",
    }

    const depositoryAccount: PlaidAccountResource = {
      id: "depository-1",
      name: "Checking Account",
      display_name: "Main Checking",
      mask: "1234",
      type: "depository", // Plaid depository type
      subtype: "checking",
      institution_name: "Bank of America",
      status: "active",
      balance: "2500.00",
      to_base: 2500.00,
      currency: "USD",
      last_autosync: "2025-10-01T10:00:00Z",
    }

    const savingsAccount: PlaidAccountResource = {
      id: "savings-1", 
      name: "Online Savings",
      display_name: null,
      mask: "5678",
      type: "savings", // Plaid savings type
      subtype: "savings",
      institution_name: "Ally Bank",
      status: "active",
      balance: "10000.00",
      to_base: 10000.00,
      currency: "USD",
      last_autosync: "2025-10-01T10:00:00Z",
    }

    const checkingAccount: PlaidAccountResource = {
      id: "checking-1",
      name: "Business Checking", 
      display_name: null,
      mask: "9999",
      type: "checking", // Plaid checking type
      subtype: "checking",
      institution_name: "Chase Bank",
      status: "active",
      balance: "3000.00",
      to_base: 3000.00,
      currency: "USD",
      last_autosync: "2025-10-01T10:00:00Z",
    }

    const result = normalizeAccounts({
      assets: [cashAsset, savingsAsset],
      plaidAccounts: [depositoryAccount, savingsAccount, checkingAccount],
      primaryCurrency: "USD",
    })

    expect(result).toHaveLength(5)
    
    // All accounts should have accountType "Cash"
    result.forEach(account => {
      expect(account.accountType).toBe("Cash")
    })

    // Test grouping behavior
    const grouped = groupAccountsByTypeAndAccountType(result, "alpha")
    
    expect(grouped).toHaveLength(1) // Only Assets group (all are assets since they're positive balances)
    expect(grouped[0].label).toBe("Assets")
    expect(grouped[0].accountTypeGroups).toHaveLength(1) // Only one Cash group
    expect(grouped[0].accountTypeGroups[0].accountType).toBe("Cash")
    expect(grouped[0].accountTypeGroups[0].accounts).toHaveLength(5) // All 5 accounts in same group
    
    // Verify alphabetical sorting within the Cash group  
    const cashAccounts = grouped[0].accountTypeGroups[0].accounts
    expect(cashAccounts[0].account.name).toBe("Business Checking")
    expect(cashAccounts[1].account.name).toBe("Emergency Fund") 
    expect(cashAccounts[2].account.name).toBe("High Yield Savings")
    expect(cashAccounts[3].account.name).toBe("Main Checking") // display_name is used
    expect(cashAccounts[4].account.name).toBe("Online Savings")
  })
})
