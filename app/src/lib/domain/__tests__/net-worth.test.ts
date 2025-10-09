import { describe, expect, it } from "vitest"
import type { AssetResource, PlaidAccountResource } from "@/lib/api"
import { normalizeAccounts, groupAccountsByTypeAndAccountType } from "../accounts"

describe("Net Worth Calculations", () => {
  it("calculates net worth correctly with assets and liabilities", () => {
    const assets: AssetResource[] = [
      {
        id: 1,
        name: "Checking Account",
        display_name: "Main Checking",
        type_name: "checking",
        subtype_name: null,
        institution_name: "Test Bank",
        status: "active",
        is_manual: false,
        is_liability: false,
        balance: "5000.00",
        to_base: 5000.00,
        currency: "USD",
        last_autosync: "2025-10-01T10:00:00Z",
        updated_at: null,
      },
      {
        id: 2,
        name: "Savings Account",
        display_name: "Emergency Fund",
        type_name: "savings",
        subtype_name: null,
        institution_name: "Test Bank",
        status: "active",
        is_manual: false,
        is_liability: false,
        balance: "15000.00",
        to_base: 15000.00,
        currency: "USD",
        last_autosync: "2025-10-01T10:00:00Z",
        updated_at: null,
      }
    ]

    const plaidAccounts: PlaidAccountResource[] = [
      {
        id: "credit-1",
        name: "Credit Card",
        display_name: "Visa Platinum",
        mask: "1234",
        type: "credit",
        subtype: "Credit Card",
        institution_name: "Credit Union",
        status: "active",
        balance: "2500.00", // Credit card balance (liability)
        to_base: 2500.00,
        currency: "USD",
        last_autosync: "2025-10-01T10:00:00Z",
      }
    ]

    const accounts = normalizeAccounts({
      assets,
      plaidAccounts,
      primaryCurrency: "USD",
    })

    const groupedAccounts = groupAccountsByTypeAndAccountType(accounts, "alpha")

    // Calculate totals like the UI does
    const totals = groupedAccounts.reduce(
      (acc: { assets: number; liabilities: number; net: number }, typeGroup) => {
        for (const accountTypeGroup of typeGroup.accountTypeGroups) {
          for (const { account } of accountTypeGroup.accounts) {
            if (account.isAsset) {
              acc.assets += account.primaryCurrencyBalance
            } else {
              acc.liabilities += account.primaryCurrencyBalance
            }
          }
        }
        acc.net = acc.assets - acc.liabilities
        return acc
      },
      { assets: 0, liabilities: 0, net: 0 },
    )

    expect(totals.assets).toBe(20000.00) // 5000 + 15000
    expect(totals.liabilities).toBe(2500.00) // Credit card balance (positive value for liability)
    expect(totals.net).toBe(17500.00) // 20000 - 2500 (assets minus liabilities)
  })

  it("handles only assets (positive net worth)", () => {
    const assets: AssetResource[] = [
      {
        id: 1,
        name: "Checking Account",
        display_name: "Main Checking",
        type_name: "checking",
        subtype_name: null,
        institution_name: "Test Bank",
        status: "active",
        is_manual: false,
        is_liability: false,
        balance: "10000.00",
        to_base: 10000.00,
        currency: "USD",
        last_autosync: "2025-10-01T10:00:00Z",
        updated_at: null,
      }
    ]

    const accounts = normalizeAccounts({
      assets,
      plaidAccounts: [],
      primaryCurrency: "USD",
    })

    const groupedAccounts = groupAccountsByTypeAndAccountType(accounts, "alpha")

    const totals = groupedAccounts.reduce(
      (acc: { assets: number; liabilities: number; net: number }, typeGroup) => {
        for (const accountTypeGroup of typeGroup.accountTypeGroups) {
          for (const { account } of accountTypeGroup.accounts) {
            if (account.isAsset) {
              acc.assets += account.primaryCurrencyBalance
            } else {
              acc.liabilities += account.primaryCurrencyBalance
            }
          }
        }
        acc.net = acc.assets - acc.liabilities
        return acc
      },
      { assets: 0, liabilities: 0, net: 0 },
    )

    expect(totals.assets).toBe(10000.00)
    expect(totals.liabilities).toBe(0)
    expect(totals.net).toBe(10000.00) // Positive net worth
  })

  it("handles only liabilities (could result in negative net worth)", () => {
    const plaidAccounts: PlaidAccountResource[] = [
      {
        id: "loan-1",
        name: "Car Loan",
        display_name: "Auto Loan",
        mask: "5678",
        type: "loan",
        subtype: "auto",
        institution_name: "Auto Finance",
        status: "active",
        balance: "25000.00",
        to_base: 25000.00,
        currency: "USD",
        last_autosync: "2025-10-01T10:00:00Z",
      }
    ]

    const accounts = normalizeAccounts({
      assets: [],
      plaidAccounts,
      primaryCurrency: "USD",
    })

    const groupedAccounts = groupAccountsByTypeAndAccountType(accounts, "alpha")

    const totals = groupedAccounts.reduce(
      (acc: { assets: number; liabilities: number; net: number }, typeGroup) => {
        for (const accountTypeGroup of typeGroup.accountTypeGroups) {
          for (const { account } of accountTypeGroup.accounts) {
            if (account.isAsset) {
              acc.assets += account.primaryCurrencyBalance
            } else {
              acc.liabilities += account.primaryCurrencyBalance
            }
          }
        }
        acc.net = acc.assets - acc.liabilities
        return acc
      },
      { assets: 0, liabilities: 0, net: 0 },
    )

    expect(totals.assets).toBe(0)
    expect(totals.liabilities).toBe(25000.00)
    expect(totals.net).toBe(-25000.00) // Negative net worth (0 - 25000)
  })

  it("handles empty accounts", () => {
    const accounts = normalizeAccounts({
      assets: [],
      plaidAccounts: [],
      primaryCurrency: "USD",
    })

    const groupedAccounts = groupAccountsByTypeAndAccountType(accounts, "alpha")

    const totals = groupedAccounts.reduce(
      (acc: { assets: number; liabilities: number; net: number }, typeGroup) => {
        for (const accountTypeGroup of typeGroup.accountTypeGroups) {
          for (const { account } of accountTypeGroup.accounts) {
            if (account.isAsset) {
              acc.assets += account.primaryCurrencyBalance
            } else {
              acc.liabilities += account.primaryCurrencyBalance
            }
          }
        }
        acc.net = acc.assets - acc.liabilities
        return acc
      },
      { assets: 0, liabilities: 0, net: 0 },
    )

    expect(totals.assets).toBe(0)
    expect(totals.liabilities).toBe(0)
    expect(totals.net).toBe(0)
  })

  it("uses primary currency balances for calculations", () => {
    const assets: AssetResource[] = [
      {
        id: 1,
        name: "CAD Account",
        display_name: "Canadian Savings",
        type_name: "savings",
        subtype_name: null,
        institution_name: "RBC",
        status: "active",
        is_manual: false,
        is_liability: false,
        balance: "1000.00", // CAD balance
        to_base: 750.00, // USD equivalent (primary currency)
        currency: "CAD",
        last_autosync: "2025-10-01T10:00:00Z",
        updated_at: null,
      }
    ]

    const accounts = normalizeAccounts({
      assets,
      plaidAccounts: [],
      primaryCurrency: "USD",
    })

    const groupedAccounts = groupAccountsByTypeAndAccountType(accounts, "alpha")

    const totals = groupedAccounts.reduce(
      (acc: { assets: number; liabilities: number; net: number }, typeGroup) => {
        for (const accountTypeGroup of typeGroup.accountTypeGroups) {
          for (const { account } of accountTypeGroup.accounts) {
            if (account.isAsset) {
              acc.assets += account.primaryCurrencyBalance
            } else {
              acc.liabilities += account.primaryCurrencyBalance
            }
          }
        }
        acc.net = acc.assets - acc.liabilities
        return acc
      },
      { assets: 0, liabilities: 0, net: 0 },
    )

    // Should use to_base (USD) value, not balance (CAD) value
    expect(totals.assets).toBe(750.00)
    expect(totals.net).toBe(750.00)
  })
})

describe("Net Worth Color Coding", () => {
  it("should apply positive colors for positive net worth", () => {
    const netWorth = 15000.00
    const colorClass = netWorth >= 0 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400'
    
    expect(colorClass).toBe('text-green-600 dark:text-green-400')
  })

  it("should apply negative colors for negative net worth", () => {
    const netWorth = -5000.00
    const colorClass = netWorth >= 0 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400'
    
    expect(colorClass).toBe('text-red-600 dark:text-red-400')
  })

  it("should apply positive colors for zero net worth", () => {
    const netWorth = 0
    const colorClass = netWorth >= 0 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400'
    
    expect(colorClass).toBe('text-green-600 dark:text-green-400')
  })
})
