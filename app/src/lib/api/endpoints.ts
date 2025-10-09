import { z } from "zod"
import type { ApiClient, RequestConfig } from "./client"
import { createParseError } from "./errors"

const currencyCodeSchema = z
  .string()
  .trim()
  .min(1, "Currency code cannot be empty")
  .transform((code) => code.toUpperCase())

const optionalCurrencyCodeSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") {
      return undefined
    }
    return value
  },
  currencyCodeSchema.optional(),
)

const numericValueSchema = z
  .union([z.number(), z.string(), z.null()])
  .transform((value, ctx) => {
    if (value === null) {
      return null
    }

    if (typeof value === "number") {
      return value
    }

    const parsed = Number.parseFloat(value)
    if (Number.isNaN(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid numeric value" })
      return z.NEVER
    }

    return parsed
  })

const rawMeSchema = z.object({
  user_name: z.string(),
  user_email: z.string().email().optional().nullable(),
  user_id: z.number().int().optional(),
  account_id: z.number().int().optional(),
  budget_name: z.string().optional().nullable(),
  primary_currency: currencyCodeSchema,
  api_key_label: z.string().optional().nullable(),
})

const meResponseSchema = z.union([
  rawMeSchema,
  z.object({ data: rawMeSchema }),
  z.object({ me: rawMeSchema }),
])

const assetItemSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    display_name: z.string().nullable().optional(),
    type_name: z.string().nullable().optional(),
    subtype_name: z.string().nullable().optional(),
    institution_name: z.string().nullable().optional(),
    balance: z.string(), // API returns string format to 4 decimal places
    to_base: numericValueSchema.optional(), // Added Feb 6, 2025 - balance converted to primary currency
    currency: optionalCurrencyCodeSchema, // Three-letter lowercase ISO 4217 format
    balance_as_of: z.string().nullable().optional(), // ISO 8601 extended format
    closed_on: z.string().nullable().optional(), // Date asset was closed
    exclude_transactions: z.boolean().optional(), // Hide from manual transaction assignment
    created_at: z.string().nullable().optional(), // ISO 8601 extended format
    // Legacy fields for backward compatibility
    status: z.string().nullable().optional(),
    is_manual: z.boolean().optional(),
    is_liability: z.boolean().optional(),
    last_autosync: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough()

const assetsResponseSchema = z.union([
  z.object({ assets: z.array(assetItemSchema) }),
  z.array(assetItemSchema),
])

const plaidAccountItemSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    display_name: z.string().nullable().optional(),
    type: z.string().nullable().optional(), // Primary type: credit, depository, brokerage, cash, loan, investment
    subtype: z.string().nullable().optional(), // Optional subtype set by Plaid
    mask: z.string().nullable().optional(), // Last 3-4 digits of account
    institution_name: z.string().nullable().optional(),
    status: z.string().nullable().optional(), // active, inactive, relink, syncing, error, not found, not supported
    balance: z.string().nullable().optional(), // String format to 4 decimal places, set by Plaid
    to_base: numericValueSchema.optional(), // Added Feb 6, 2025 - balance converted to primary currency
    currency: optionalCurrencyCodeSchema, // ISO 4217 format, set by Plaid
    date_linked: z.string().nullable().optional(), // ISO 8601 format
    limit: z.number().nullable().optional(), // Credit limit for credit accounts
    import_start_date: z.string().nullable().optional(), // Earliest date for importing transactions
    last_import: z.string().nullable().optional(), // ISO 8601 - last successful import
    last_fetch: z.string().nullable().optional(), // ISO 8601 - last check for updates
    plaid_last_successful_update: z.string().nullable().optional(), // ISO 8601 - last Plaid connection
    balance_last_update: z.string().nullable().optional(), // ISO 8601 - when balance was updated
    // Legacy fields for backward compatibility
    account_currency: optionalCurrencyCodeSchema,
    primary_currency: optionalCurrencyCodeSchema,
    last_autosync: z.string().nullable().optional(),
  })
  .passthrough()

const plaidAccountsResponseSchema = z.union([
  z.object({ plaid_accounts: z.array(plaidAccountItemSchema) }),
  z.array(plaidAccountItemSchema),
])

export interface MeProfile {
  name: string
  primaryCurrency: string
  email?: string
  userId?: number
  accountId?: number
  budgetName?: string
  apiKeyLabel?: string
}

export type AssetResource = z.infer<typeof assetItemSchema>
export type PlaidAccountResource = z.infer<typeof plaidAccountItemSchema>

function normalizeMeProfile(raw: z.infer<typeof rawMeSchema>): MeProfile {
  return {
    name: raw.user_name,
    primaryCurrency: raw.primary_currency,
    email: raw.user_email ?? undefined,
    userId: raw.user_id ?? undefined,
    accountId: raw.account_id ?? undefined,
    budgetName: raw.budget_name ?? undefined,
    apiKeyLabel: raw.api_key_label ?? undefined,
  }
}

async function parseWithSchema<TSchema extends z.ZodTypeAny>(schema: TSchema, payload: unknown, label: string) {
  const result = schema.safeParse(payload)
  if (!result.success) {
    console.error(`API Error: Invalid ${label} response`, {
      label,
      payload: JSON.stringify(payload, null, 2),
      errors: result.error.issues
    })
    throw createParseError(`Invalid ${label} response`, result.error.issues)
  }

  return result.data
}

export async function fetchMe(
  client: ApiClient,
  config?: Omit<RequestConfig, "path" | "method">,
): Promise<MeProfile> {
  const raw = await client.get<unknown>("/me", config)
  const parsed = await parseWithSchema(meResponseSchema, raw, "/v1/me")

  if ("data" in parsed) {
    return normalizeMeProfile(parsed.data)
  }

  if ("me" in parsed) {
    return normalizeMeProfile(parsed.me)
  }

  return normalizeMeProfile(parsed)
}

export async function fetchAssets(
  client: ApiClient,
  config?: Omit<RequestConfig, "path" | "method">,
): Promise<AssetResource[]> {
  const raw = await client.get<unknown>("/assets", config)
  const parsed = await parseWithSchema(assetsResponseSchema, raw, "/v1/assets")

  return Array.isArray(parsed) ? parsed : parsed.assets
}

export async function fetchPlaidAccounts(
  client: ApiClient,
  config?: Omit<RequestConfig, "path" | "method">,
): Promise<PlaidAccountResource[]> {
  const raw = await client.get<unknown>("/plaid_accounts", config)
  const parsed = await parseWithSchema(plaidAccountsResponseSchema, raw, "/v1/plaid_accounts")

  return Array.isArray(parsed) ? parsed : parsed.plaid_accounts
}
