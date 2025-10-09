import { describe, expect, it } from "vitest"
import { groupAccountsByTypeAndAccountType } from "../accounts"
import type { NormalizedAccount } from "../accounts"

describe("groupAccountsByTypeAndAccountType", () => {
  const mockAsset: NormalizedAccount = {
    id: "1",
    name: "Checking Account",
    accountType: "checking",
    type: "asset",
    isAsset: true,
    source: "plaid",
    primaryCurrencyBalance: 1000,
    accountCurrencyBalance: 1000,
    primaryCurrencyCode: "USD",
    accountCurrencyCode: "USD",
    iconKey: "asset-checking",
  }

  const mockLiability: NormalizedAccount = {
    id: "2", 
    name: "Credit Card",
    accountType: "credit",
    type: "liability",
    isAsset: false,
    source: "plaid",
    primaryCurrencyBalance: -500,
    accountCurrencyBalance: -500,
    primaryCurrencyCode: "USD",
    accountCurrencyCode: "USD",
    iconKey: "liability-credit",
  }

  const mockSavingsAccount: NormalizedAccount = {
    id: "3",
    name: "Savings Account", 
    accountType: "savings",
    type: "asset",
    isAsset: true,
    source: "plaid",
    primaryCurrencyBalance: 5000,
    accountCurrencyBalance: 5000,
    primaryCurrencyCode: "USD",
    accountCurrencyCode: "USD",
    iconKey: "asset-savings",
  }

  it("groups accounts by asset/liability and account type", () => {
    const accounts = [mockAsset, mockLiability, mockSavingsAccount]
    const result = groupAccountsByTypeAndAccountType(accounts, "alpha")

    expect(result).toHaveLength(2)
    
    // Assets group should come first
    const assetsGroup = result[0]
    expect(assetsGroup.type).toBe("asset")
    expect(assetsGroup.label).toBe("Assets")
    expect(assetsGroup.accountTypeGroups).toHaveLength(2)
    
    // Check account type ordering (alphabetical)
    expect(assetsGroup.accountTypeGroups[0].accountType).toBe("checking") 
    expect(assetsGroup.accountTypeGroups[1].accountType).toBe("savings")
    
    // Liabilities group should come second
    const liabilitiesGroup = result[1]
    expect(liabilitiesGroup.type).toBe("liability")
    expect(liabilitiesGroup.label).toBe("Liabilities")
    expect(liabilitiesGroup.accountTypeGroups).toHaveLength(1)
    expect(liabilitiesGroup.accountTypeGroups[0].accountType).toBe("credit")
  })

  it("sorts accounts within account types alphabetically", () => {
    const account1 = { ...mockAsset, id: "a", name: "ZZZ Bank" }
    const account2 = { ...mockAsset, id: "b", name: "AAA Bank" }
    
    const accounts = [account1, account2]
    const result = groupAccountsByTypeAndAccountType(accounts, "alpha")

    const checkingAccounts = result[0].accountTypeGroups[0].accounts
    expect(checkingAccounts[0].account.name).toBe("AAA Bank")
    expect(checkingAccounts[1].account.name).toBe("ZZZ Bank")
  })

  it("sorts accounts within account types by balance when balance mode selected", () => {
    const account1 = { ...mockAsset, id: "a", name: "Low Balance", primaryCurrencyBalance: 100 }
    const account2 = { ...mockAsset, id: "b", name: "High Balance", primaryCurrencyBalance: 1000 }
    
    const accounts = [account1, account2]
    const result = groupAccountsByTypeAndAccountType(accounts, "balance")

    const checkingAccounts = result[0].accountTypeGroups[0].accounts
    expect(checkingAccounts[0].account.name).toBe("High Balance")
    expect(checkingAccounts[1].account.name).toBe("Low Balance")
  })
})
