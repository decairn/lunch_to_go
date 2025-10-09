import type { AssetResource, PlaidAccountResource } from "@/lib/api"

export type NormalizedAccountType = "asset" | "liability"
export type AccountSource = "asset" | "plaid"

export interface NormalizedAccount {
  id: string
  name: string
  accountType: string
  type: NormalizedAccountType
  isAsset: boolean
  source: AccountSource
  institutionName?: string
  status?: string
  lastUpdated?: string | null
  daysSinceUpdate?: number | null
  primaryCurrencyBalance: number
  accountCurrencyBalance: number
  primaryCurrencyCode: string
  accountCurrencyCode: string
  iconKey: string
}

interface NormalizeAccountsParams {
  assets?: AssetResource[]
  plaidAccounts?: PlaidAccountResource[]
  primaryCurrency: string
}

const LIABILITY_TYPE_TOKENS = ["credit", "loan", "mortgage", "liability", "debt", "payable"]

function coerceNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback
  }

  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeId(value: string | number): string {
  return String(value)
}

function pickName(name?: string | null, fallback?: string | null) {
  if (name && name.trim().length > 0) {
    return name.trim()
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback.trim()
  }

  return "Unnamed Account"
}

function normalizeAccountType(typeName?: string | null, subtypeName?: string | null, isPlaidDepository = false) {
  // Override Plaid depository account types and treat as cash
  if (isPlaidDepository) {
    return "Cash"
  }

  const candidate = subtypeName ?? typeName
  if (!candidate) {
    return "Other"
  }

  return candidate.trim()
}

function normalizeTimestamp(value: string | null | undefined): string | null {
  if (!value) return null
  
  try {
    const date = new Date(value)
    return date.toISOString()
  } catch {
    return null
  }
}

function calculateDaysSinceUpdate(lastUpdated: string | null): number | null {
  if (!lastUpdated) return null
  
  try {
    const updateDate = new Date(lastUpdated)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - updateDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  } catch {
    return null
  }
}

export function formatDaysSinceUpdate(days: number | null): string {
  if (days === null || days === undefined) return "Unknown"
  if (days === 0) return "Updated today"
  if (days === 1) return "Updated 1 day ago"
  return `Updated ${days} days ago`
}

export function getAccountIcon(iconKey: string): string {
  // Map iconKey to appropriate Unicode symbols or emoji
  const iconMap: Record<string, string> = {
    // Asset icons
    "asset-checking": "🏦",
    "asset-savings": "💰",
    "asset-investment": "📈",
    "asset-retirement": "🏖️",
    "asset-cash": "💰",
    "asset-real-estate": "🏠",
    "asset-primary-residence": "🏡",
    "asset-vehicle": "🚗",
    "asset-other": "💼",
    
    // Liability icons  
    "liability-credit": "💳",
    "liability-credit-card": "💳",
    "liability-loan": "📄",
    "liability-mortgage": "🏠",
    "liability-other": "📉",
    
    // Fallback icons
    "asset": "💰",
    "liability": "💳"
  }
  
  const direct = iconMap[iconKey]
  if (direct) {
    return direct
  }
  
  const [category] = iconKey.split("-")
  if (category && iconMap[category]) {
    return iconMap[category]
  }
  
  if (iconKey.startsWith("liability")) {
    return "💳"
  }

  if (iconKey.startsWith("asset")) {
    return "💰"
  }

  return "📄"
}

function buildIconKey(type: NormalizedAccountType, accountType: string) {
  const sanitizedAccountType = accountType.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "other"
  return `${type}-${sanitizedAccountType}`
}

function determineAccountTypeFromPlaid(account: PlaidAccountResource): NormalizedAccountType {
  const typeValue = account.type ?? ""
  const token = typeValue.toString().toLowerCase()

  if (LIABILITY_TYPE_TOKENS.some((needle) => token.includes(needle))) {
    return "liability"
  }

  return "asset"
}

function inferAccountTypeForAsset(asset: AssetResource): NormalizedAccountType {
  if (asset.is_liability) {
    return "liability"
  }

  const typeName = asset.type_name ?? ""
  if (LIABILITY_TYPE_TOKENS.some((needle) => typeName.toLowerCase().includes(needle))) {
    return "liability"
  }

  return "asset"
}

function normalizeAsset(asset: AssetResource, primaryCurrency: string): NormalizedAccount {
  const type = inferAccountTypeForAsset(asset)
  
  // Check if this is a cash-like asset account type to normalize with Plaid depository accounts
  const isCashLike = asset.type_name?.toLowerCase()?.includes("cash") || 
                     asset.type_name?.toLowerCase()?.includes("checking") ||
                     asset.type_name?.toLowerCase()?.includes("savings") ||
                     asset.type_name?.toLowerCase()?.includes("chequing")
  
  const accountType = isCashLike ? "Cash" : normalizeAccountType(asset.type_name, null)
  
  // Simple currency handling: asset.currency is account currency, to_base is primary currency amount
  const accountCurrencyCode = (asset.currency ?? primaryCurrency).toUpperCase()
  const accountCurrencyBalance = coerceNumber(asset.balance, 0)
  const primaryCurrencyBalance = coerceNumber((asset as AssetResource & { to_base?: number }).to_base, accountCurrencyBalance)

  const lastUpdated = normalizeTimestamp(asset.balance_as_of ?? asset.last_autosync ?? asset.updated_at ?? null)
  const daysSinceUpdate = calculateDaysSinceUpdate(lastUpdated)

  return {
    id: normalizeId(asset.id),
    name: pickName(asset.display_name ?? undefined, asset.name),
    accountType,
    type,
    isAsset: type === "asset",
    source: "asset",
    institutionName: asset.institution_name ?? undefined,
    status: asset.status ?? undefined,
    lastUpdated,
    daysSinceUpdate,
    primaryCurrencyBalance,
    accountCurrencyBalance,
    primaryCurrencyCode: primaryCurrency.toUpperCase(),
    accountCurrencyCode,
    iconKey: buildIconKey(type, accountType),
  }
}

function normalizePlaidAccount(account: PlaidAccountResource, primaryCurrency: string): NormalizedAccount {
  const type = determineAccountTypeFromPlaid(account)
  
  // Check if this is any cash-like account type (depository, savings, checking, etc.)
  const accountTypeRaw = account.type?.toLowerCase() || ""
  const isCashLike = accountTypeRaw === "depository" || 
                     accountTypeRaw === "savings" ||
                     accountTypeRaw === "checking" ||
                     accountTypeRaw.includes("cash") ||
                     accountTypeRaw.includes("chequing")
  
  const accountType = isCashLike ? "Cash" : normalizeAccountType(account.type ?? undefined, null, false)
  
  // Simple currency handling: account.currency is account currency, to_base is primary currency amount
  const accountCurrencyCode = (account.currency ?? primaryCurrency).toUpperCase()
  const accountCurrencyBalance = coerceNumber(account.balance, 0)
  const primaryCurrencyBalance = coerceNumber((account as PlaidAccountResource & { to_base?: number }).to_base, accountCurrencyBalance)

  const lastUpdated = normalizeTimestamp(account.balance_last_update ?? account.last_fetch ?? account.last_autosync ?? null)
  const daysSinceUpdate = calculateDaysSinceUpdate(lastUpdated)

  return {
    id: normalizeId(account.id),
    name: pickName(account.display_name ?? undefined, account.name),
    accountType,
    type,
    isAsset: type === "asset",
    source: "plaid",
    institutionName: account.institution_name ?? undefined,
    status: account.status ?? undefined,
    lastUpdated,
    daysSinceUpdate,
    primaryCurrencyBalance,
    accountCurrencyBalance,
    primaryCurrencyCode: primaryCurrency.toUpperCase(),
    accountCurrencyCode,
    iconKey: buildIconKey(type, accountType),
  }
}

export function normalizeAccounts({
  assets = [],
  plaidAccounts = [],
  primaryCurrency,
}: NormalizeAccountsParams): NormalizedAccount[] {
  // Filter out closed accounts before normalization
  // Assets use either status="closed" or have a closed_on date
  const activeAssets = assets.filter(asset => 
    asset.status !== "closed" && !asset.closed_on
  )
  const activePlaidAccounts = plaidAccounts.filter(account => account.status !== "closed")
  const normalizedAssets = activeAssets.map((asset) => normalizeAsset(asset, primaryCurrency))
  const normalizedPlaidAccounts = activePlaidAccounts.map((account) => normalizePlaidAccount(account, primaryCurrency))

  return [...normalizedAssets, ...normalizedPlaidAccounts]
}

export interface GroupedAccount {
  account: NormalizedAccount
}

export interface AccountTypeGroup {
  accountType: string
  accounts: GroupedAccount[]
}

export interface AccountGroup {
  type: NormalizedAccountType
  label: string
  accountTypeGroups: AccountTypeGroup[]
}

export function groupAccountsByTypeAndAccountType(
  accounts: NormalizedAccount[],
  sortMode: "alpha" | "balance" = "alpha"
): AccountGroup[] {
  // Separate accounts by asset/liability
  const assets = accounts.filter(account => account.isAsset)
  const liabilities = accounts.filter(account => !account.isAsset)

  function createTypeGroup(
    typeAccounts: NormalizedAccount[], 
    type: NormalizedAccountType, 
    label: string
  ): AccountGroup {
    // Group by accountType
    const accountTypeMap = new Map<string, NormalizedAccount[]>()
    
    for (const account of typeAccounts) {
      const accountType = account.accountType
      if (!accountTypeMap.has(accountType)) {
        accountTypeMap.set(accountType, [])
      }
      accountTypeMap.get(accountType)!.push(account)
    }

    // Create account type groups with sorted accounts
    const accountTypeGroups: AccountTypeGroup[] = []
    
    // Sort account types alphabetically
    const sortedAccountTypes = Array.from(accountTypeMap.keys()).sort((a, b) => a.localeCompare(b))
    
    for (const accountType of sortedAccountTypes) {
      const accountTypeAccounts = accountTypeMap.get(accountType)!
      
      // Sort accounts within account type
      const sortedAccounts = [...accountTypeAccounts]
      if (sortMode === "alpha") {
        sortedAccounts.sort((a, b) => a.name.localeCompare(b.name))
      } else {
        sortedAccounts.sort((a, b) => b.primaryCurrencyBalance - a.primaryCurrencyBalance)
      }
      
      accountTypeGroups.push({
        accountType,
        accounts: sortedAccounts.map(account => ({ account }))
      })
    }

    return {
      type,
      label,
      accountTypeGroups
    }
  }

  const groups: AccountGroup[] = []
  
  // Always show Assets first, then Liabilities
  if (assets.length > 0) {
    groups.push(createTypeGroup(assets, "asset", "Assets"))
  }
  
  if (liabilities.length > 0) {
    groups.push(createTypeGroup(liabilities, "liability", "Liabilities"))
  }

  return groups
}

export type { NormalizeAccountsParams }

