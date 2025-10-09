import { loadDemoAccounts } from "../data/demo-accounts"
import { groupAccountsByTypeAndAccountType, type NormalizedAccount, type AccountGroup } from "./accounts"

/**
 * Service for loading demo account data
 */
export async function loadDemoAccountData(
  primaryCurrency: string = "CAD",
  sortMode: "alpha" | "balance" = "alpha"
): Promise<AccountGroup[]> {
  try {
    const accounts = await loadDemoAccounts(primaryCurrency)
    return groupAccountsByTypeAndAccountType(accounts, sortMode)
  } catch (error) {
    console.error("Failed to load demo account data:", error)
    throw error
  }
}

/**
 * Calculate totals from demo account data
 */
export function calculateDemoTotals(accounts: NormalizedAccount[]): {
  assets: number
  liabilities: number
  net: number
} {
  return accounts.reduce(
    (acc, account) => {
      if (account.isAsset) {
        acc.assets += account.primaryCurrencyBalance
      } else {
        acc.liabilities += account.primaryCurrencyBalance
      }
      acc.net = acc.assets - acc.liabilities
      return acc
    },
    { assets: 0, liabilities: 0, net: 0 }
  )
}

/**
 * Get demo accounts in normalized format
 */
export async function getDemoAccountsNormalized(primaryCurrency: string = "CAD"): Promise<NormalizedAccount[]> {
  return await loadDemoAccounts(primaryCurrency)
}