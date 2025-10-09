import { describe, expect, it, vi } from "vitest"
import { fetchAssets, fetchPlaidAccounts } from "@/lib/api"
import type { ApiClient } from "@/lib/api"

describe("Currency API Fields", () => {
  describe("fetchAssets - to_base field support", () => {
    it("parses assets with to_base field correctly", async () => {
      const assetResponse = {
        assets: [
          {
            id: 123,
            name: "USD Asset",
            display_name: "Test USD Asset",
            type_name: "checking",
            subtype_name: "checking", 
            institution_name: "Test Bank",
            balance: "1000.5000", // API returns string format to 4 decimal places
            to_base: 1350.67, // USD to CAD conversion
            currency: "USD",
            updated_at: "2025-01-01T00:00:00Z"
          }
        ]
      }

      const client = {
        get: vi.fn().mockResolvedValue(assetResponse)
      } as unknown as ApiClient

      const assets = await fetchAssets(client)

      expect(assets).toHaveLength(1)
      expect(assets[0]).toMatchObject({
        id: 123,
        name: "USD Asset",
        balance: "1000.5000", // API format
        to_base: 1350.67,
        currency: "USD"
      })
    })

    it("handles assets without to_base field gracefully", async () => {
      const assetResponse = {
        assets: [
          {
            id: 456,
            name: "CAD Asset",
            balance: "2000.0000", // API returns string format
            currency: "CAD"
          }
        ]
      }

      const client = {
        get: vi.fn().mockResolvedValue(assetResponse)
      } as unknown as ApiClient

      const assets = await fetchAssets(client)

      expect(assets[0]).toMatchObject({
        id: 456,
        name: "CAD Asset",
        balance: "2000.0000", // API format
        currency: "CAD"
      })
      expect(assets[0].to_base).toBeUndefined()
    })
  })

  describe("fetchPlaidAccounts - to_base field support", () => {
    it("parses plaid accounts with to_base field correctly", async () => {
      const plaidResponse = {
        plaid_accounts: [
          {
            id: 789,
            name: "Wells Fargo Checking",
            display_name: "Joint WF Checking",
            type: "depository",
            accountType: "checking",
            institution_name: "Wells Fargo",
            balance: "34267.6400", // API returns string format to 4 decimal places
            to_base: 47772.69, // USD to CAD conversion at ~1.3941 rate
            currency: "USD", // Official API field
            account_currency: "USD", // Legacy fallback
            primary_currency: "CAD"
          }
        ]
      }

      const client = {
        get: vi.fn().mockResolvedValue(plaidResponse)
      } as unknown as ApiClient

      const accounts = await fetchPlaidAccounts(client)

      expect(accounts).toHaveLength(1)
      expect(accounts[0]).toMatchObject({
        id: 789,
        name: "Wells Fargo Checking",
        balance: "34267.6400", // API format
        to_base: 47772.69,
        currency: "USD", // Official field
        account_currency: "USD" // Legacy fallback
      })
    })

    it("handles plaid accounts without to_base field gracefully", async () => {
      const plaidResponse = {
        plaid_accounts: [
          {
            id: 101,
            name: "CAD Checking", 
            balance: "5000.0000", // API returns string format
            currency: "CAD" // Official API field
          }
        ]
      }

      const client = {
        get: vi.fn().mockResolvedValue(plaidResponse)
      } as unknown as ApiClient

      const accounts = await fetchPlaidAccounts(client)

      expect(accounts[0]).toMatchObject({
        id: 101,
        name: "CAD Checking",
        balance: "5000.0000", // API format
        currency: "CAD" // Official field
      })
      expect(accounts[0].to_base).toBeUndefined()
    })
  })
})
