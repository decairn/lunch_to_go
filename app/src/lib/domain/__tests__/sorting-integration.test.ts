import { describe, expect, it } from "vitest"
import { groupAccountsByTypeAndAccountType } from "../accounts"
import type { NormalizedAccount } from "../accounts"

describe("Sorting Integration", () => {
  // Mock accounts with different balances and names for comprehensive testing
  const mockAccounts: NormalizedAccount[] = [
    {
      id: "1",
      name: "C High Balance Account",
      accountType: "Checking",
      type: "asset",
      isAsset: true,
      source: "plaid",
      primaryCurrencyBalance: 50000,
      accountCurrencyBalance: 50000,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "asset-checking",
    },
    {
      id: "2",
      name: "A Low Balance Account",
      accountType: "Checking", 
      type: "asset",
      isAsset: true,
      source: "plaid",
      primaryCurrencyBalance: 1000,
      accountCurrencyBalance: 1000,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "asset-checking",
    },
    {
      id: "3",
      name: "B Medium Balance Account",
      accountType: "Checking",
      type: "asset", 
      isAsset: true,
      source: "plaid",
      primaryCurrencyBalance: 25000,
      accountCurrencyBalance: 25000,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD", 
      iconKey: "asset-checking",
    },
    {
      id: "4",
      name: "Z Credit Card",
      accountType: "Credit Card",
      type: "liability",
      isAsset: false,
      source: "plaid",
      primaryCurrencyBalance: 500,
      accountCurrencyBalance: 500,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "liability-credit-card",
    },
    {
      id: "5", 
      name: "A Credit Card",
      accountType: "Credit Card",
      type: "liability",
      isAsset: false,
      source: "plaid",
      primaryCurrencyBalance: 100,
      accountCurrencyBalance: 100,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "liability-credit-card",
    },
  ]

  it("sorts accounts alphabetically when alpha mode is selected", () => {
    const result = groupAccountsByTypeAndAccountType(mockAccounts, "alpha")
    
    // Check asset accounts are alphabetically sorted
    const assetAccounts = result[0].accountTypeGroups[0].accounts
    expect(assetAccounts[0].account.name).toBe("A Low Balance Account")
    expect(assetAccounts[1].account.name).toBe("B Medium Balance Account") 
    expect(assetAccounts[2].account.name).toBe("C High Balance Account")
    
    // Check liability accounts are alphabetically sorted
    const liabilityAccounts = result[1].accountTypeGroups[0].accounts
    expect(liabilityAccounts[0].account.name).toBe("A Credit Card")
    expect(liabilityAccounts[1].account.name).toBe("Z Credit Card")
  })

  it("sorts accounts by balance when balance mode is selected", () => {
    const result = groupAccountsByTypeAndAccountType(mockAccounts, "balance")
    
    // Check asset accounts are sorted by balance (high to low)
    const assetAccounts = result[0].accountTypeGroups[0].accounts
    expect(assetAccounts[0].account.name).toBe("C High Balance Account") // 50000
    expect(assetAccounts[0].account.primaryCurrencyBalance).toBe(50000)
    expect(assetAccounts[1].account.name).toBe("B Medium Balance Account") // 25000
    expect(assetAccounts[1].account.primaryCurrencyBalance).toBe(25000)
    expect(assetAccounts[2].account.name).toBe("A Low Balance Account") // 1000
    expect(assetAccounts[2].account.primaryCurrencyBalance).toBe(1000)
    
    // Check liability accounts are sorted by balance (high to low)
    const liabilityAccounts = result[1].accountTypeGroups[0].accounts
    expect(liabilityAccounts[0].account.name).toBe("Z Credit Card") // 500
    expect(liabilityAccounts[0].account.primaryCurrencyBalance).toBe(500)
    expect(liabilityAccounts[1].account.name).toBe("A Credit Card") // 100
    expect(liabilityAccounts[1].account.primaryCurrencyBalance).toBe(100)
  })

  it("maintains Asset/Liability grouping regardless of sort mode", () => {
    const alphaResult = groupAccountsByTypeAndAccountType(mockAccounts, "alpha")
    const balanceResult = groupAccountsByTypeAndAccountType(mockAccounts, "balance")
    
    // Both should have same structure: Assets first, then Liabilities
    expect(alphaResult).toHaveLength(2)
    expect(balanceResult).toHaveLength(2)
    
    expect(alphaResult[0].type).toBe("asset")
    expect(alphaResult[0].label).toBe("Assets")
    expect(balanceResult[0].type).toBe("asset")
    expect(balanceResult[0].label).toBe("Assets")
    
    expect(alphaResult[1].type).toBe("liability")
    expect(alphaResult[1].label).toBe("Liabilities")
    expect(balanceResult[1].type).toBe("liability")
    expect(balanceResult[1].label).toBe("Liabilities")
  })

  it("preserves account type grouping and alphabetical account type ordering regardless of account sort mode", () => {
    const alphaResult = groupAccountsByTypeAndAccountType(mockAccounts, "alpha")
    const balanceResult = groupAccountsByTypeAndAccountType(mockAccounts, "balance")
    
    // Both should group by account type the same way
    expect(alphaResult[0].accountTypeGroups).toHaveLength(1) // Only "Checking" for assets
    expect(alphaResult[0].accountTypeGroups[0].accountType).toBe("Checking")
    expect(balanceResult[0].accountTypeGroups).toHaveLength(1)
    expect(balanceResult[0].accountTypeGroups[0].accountType).toBe("Checking")
    
    expect(alphaResult[1].accountTypeGroups).toHaveLength(1) // Only "Credit Card" for liabilities
    expect(alphaResult[1].accountTypeGroups[0].accountType).toBe("Credit Card")
    expect(balanceResult[1].accountTypeGroups).toHaveLength(1)
    expect(balanceResult[1].accountTypeGroups[0].accountType).toBe("Credit Card")
  })

  it("handles zero and negative balances correctly in balance sort", () => {
    const accountsWithZero: NormalizedAccount[] = [
      {
        id: "1",
        name: "Zero Balance",
        accountType: "Savings",
        type: "asset",
        isAsset: true,
        source: "plaid",
        primaryCurrencyBalance: 0,
        accountCurrencyBalance: 0,
        primaryCurrencyCode: "CAD",
        accountCurrencyCode: "CAD",
        iconKey: "asset-savings",
      },
      {
        id: "2",
        name: "Positive Balance",
        accountType: "Savings",
        type: "asset",
        isAsset: true,
        source: "plaid",
        primaryCurrencyBalance: 1000,
        accountCurrencyBalance: 1000,
        primaryCurrencyCode: "CAD",
        accountCurrencyCode: "CAD",
        iconKey: "asset-savings",
      },
      {
        id: "3",
        name: "Negative Balance",
        accountType: "Savings",
        type: "asset",
        isAsset: true,
        source: "plaid",
        primaryCurrencyBalance: -500,
        accountCurrencyBalance: -500,
        primaryCurrencyCode: "CAD",
        accountCurrencyCode: "CAD",
        iconKey: "asset-savings",
      },
    ]

    const result = groupAccountsByTypeAndAccountType(accountsWithZero, "balance")
    const accounts = result[0].accountTypeGroups[0].accounts

    // Should be sorted by balance: positive > zero > negative
    expect(accounts[0].account.name).toBe("Positive Balance")
    expect(accounts[0].account.primaryCurrencyBalance).toBe(1000)
    expect(accounts[1].account.name).toBe("Zero Balance")
    expect(accounts[1].account.primaryCurrencyBalance).toBe(0)
    expect(accounts[2].account.name).toBe("Negative Balance")
    expect(accounts[2].account.primaryCurrencyBalance).toBe(-500)
  })
})
