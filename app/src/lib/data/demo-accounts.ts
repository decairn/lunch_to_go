import type { NormalizedAccount } from "../domain/accounts"

/**
 * Raw CSV row from demo_accounts_data.csv
 */
interface DemoAccountRow {
  "Row Number": string
  "Asset or Liability": string
  "Account Type": string
  "Account Name": string
  "Institution": string
  "Days Since Update": string
  "Account Currency": string
  "Account Balance": string
  "Base Currency": string
  "To Base Balance": string
}

/**
 * Parses a CSV string into an array of objects
 */
function parseCSV(csvText: string): DemoAccountRow[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = lines[0].split(',').map(header => header.trim())
  const rows: DemoAccountRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) {
      console.warn(`Skipping malformed CSV row ${i + 1}: expected ${headers.length} columns, got ${values.length}`)
      continue
    }

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })

    rows.push(row as unknown as DemoAccountRow)
  }

  return rows
}

/**
 * Parses a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

/**
 * Converts currency string like "$9,234.84" or "15706.63" to number
 */
function parseAmount(amountStr: string): number {
  // Remove currency symbols, commas, and extra spaces
  const cleaned = amountStr.replace(/[$,\s"]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Converts days since update string to number
 */
function parseDaysSinceUpdate(daysStr: string): number | null {
  const num = parseInt(daysStr, 10)
  return isNaN(num) ? null : num
}

/**
 * Maps demo account type to normalized account type
 */
function mapAccountType(demoType: string): string {
  const typeMapping: Record<string, string> = {
    'CASH': 'Cash',
    'INVESTMENT': 'Investment', 
    'REAL ESTATE': 'Real Estate',
    'CREDIT': 'Credit',
    'LOAN': 'Loan'
  }

  return typeMapping[demoType.toUpperCase()] || demoType
}

/**
 * Determines if account is an asset based on the Asset or Liability column
 */
function isAssetAccount(assetOrLiability: string): boolean {
  return assetOrLiability.toLowerCase() === 'asset'
}

/**
 * Builds icon key for demo account
 */
function buildDemoIconKey(isAsset: boolean, accountType: string): string {
  const type = isAsset ? 'asset' : 'liability'
  const sanitizedType = accountType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'other'
  return `${type}-${sanitizedType}`
}

/**
 * Generates a mock last updated timestamp based on days since update
 */
function generateLastUpdated(daysSinceUpdate: number | null): string | null {
  if (daysSinceUpdate === null) {
    return null
  }

  const now = new Date()
  now.setDate(now.getDate() - daysSinceUpdate)
  return now.toISOString()
}

/**
 * Converts a demo account row to a normalized account
 */
function convertDemoRowToAccount(row: DemoAccountRow, primaryCurrency: string): NormalizedAccount {
  const isAsset = isAssetAccount(row["Asset or Liability"])
  const accountType = mapAccountType(row["Account Type"])
  const accountCurrencyBalance = parseAmount(row["Account Balance"])
  const primaryCurrencyBalance = parseAmount(row["To Base Balance"])
  const daysSinceUpdate = parseDaysSinceUpdate(row["Days Since Update"])
  const lastUpdated = generateLastUpdated(daysSinceUpdate)

  return {
    id: `demo-${row["Row Number"]}`,
    name: row["Account Name"],
    accountType,
    type: isAsset ? "asset" : "liability",
    isAsset,
    source: "asset", // Demo data acts like manual asset accounts
    institutionName: row["Institution"] || undefined,
    status: "active",
    lastUpdated,
    daysSinceUpdate,
    primaryCurrencyBalance,
    accountCurrencyBalance,
    primaryCurrencyCode: primaryCurrency.toUpperCase(),
    accountCurrencyCode: row["Account Currency"].toUpperCase(),
    iconKey: buildDemoIconKey(isAsset, accountType),
  }
}

/**
 * Loads and parses demo account data from CSV
 */
export async function loadDemoAccounts(primaryCurrency: string = "CAD"): Promise<NormalizedAccount[]> {
  try {
    // Import the CSV file from the data directory
    const response = await fetch('/demo_accounts_data.csv')
    if (!response.ok) {
      throw new Error(`Failed to load demo data: ${response.status} ${response.statusText}`)
    }
    
    const csvText = await response.text()
    const rows = parseCSV(csvText)
    
    return rows.map(row => convertDemoRowToAccount(row, primaryCurrency))
  } catch (error) {
    console.error('Error loading demo account data:', error)
    throw new Error('Failed to load demo account data')
  }
}

/**
 * Alternative function that accepts CSV text directly (useful for testing)
 */
export function parseDemoAccountsFromCSV(csvText: string, primaryCurrency: string = "CAD"): NormalizedAccount[] {
  const rows = parseCSV(csvText)
  return rows.map(row => convertDemoRowToAccount(row, primaryCurrency))
}