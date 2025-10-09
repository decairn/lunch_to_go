import { describe, expect, it } from "vitest"
import type { AssetResource, PlaidAccountResource } from "@/lib/api"
import { normalizeAccounts } from "@/lib/domain/accounts"

describe("Currency Display Regression Tests", () => {
  describe("Zero balance USD accounts", () => {
    it("correctly displays USD zero balances in account currency mode", () => {
      const usdAsset: AssetResource = {
        id: 175328,
        name: "House - Apex Place, Escondido",
        display_name: "House - Apex Place, Escondido",
        type_name: "real estate",
        subtype_name: "primary residence",
        institution_name: null,
        status: "active",
        is_manual: true,
        is_liability: false,
        balance: "0", // USD zero balance
        to_base: 0, // CAD zero equivalent
        currency: "USD",
        last_autosync: null,
        updated_at: "2025-07-16T23:16:38.000Z",
      }

      const usdPlaid: PlaidAccountResource = {
        id: 456,
        name: "Keith ADP 401k",
        display_name: "Keith ADP 401k",
        mask: "0001",
        type: "depository",
        accountType: "retirement",
        institution_name: "ADP",
        status: "active",
        balance: "0", // USD zero balance
        to_base: 0, // CAD zero equivalent
        currency: "USD", // Simplified: use currency field
        last_autosync: "2025-01-01T08:00:00Z",
      }

      const result = normalizeAccounts({
        assets: [usdAsset],
        plaidAccounts: [usdPlaid],
        primaryCurrency: "CAD",
      })

      // Both accounts should have correct currency codes and zero balances
      const normalizedAsset = result.find((item) => item.source === "asset")
      const normalizedPlaid = result.find((item) => item.source === "plaid")

      expect(normalizedAsset).toMatchObject({
        id: "175328",
        name: "House - Apex Place, Escondido",
        accountCurrencyBalance: 0,
        primaryCurrencyBalance: 0,
        accountCurrencyCode: "USD", // Should be USD for proper $0.00 display
        primaryCurrencyCode: "CAD",
      })

      expect(normalizedPlaid).toMatchObject({
        id: "456", 
        name: "Keith ADP 401k",
        accountCurrencyBalance: 0,
        primaryCurrencyBalance: 0,
        accountCurrencyCode: "USD", // Should be USD for proper $0.00 display
        primaryCurrencyCode: "CAD",
      })
    })

    it("correctly displays USD mortgage liability with zero balance", () => {
      const usdMortgage: AssetResource = {
        id: 175329,
        name: "PM Mortgage - Apex Place 2.65%",
        display_name: "PM Mortgage - Apex Place 2.65%",
        type_name: "loan",
        subtype_name: "mortgage",
        institution_name: "PennyMac",
        status: "active",
        is_manual: true,
        is_liability: true,
        balance: "0", // USD zero balance
        to_base: 0, // CAD zero equivalent
        currency: "USD",
        last_autosync: null,
        updated_at: "2025-07-16T23:18:11.000Z",
      }

      const [normalized] = normalizeAccounts({
        assets: [usdMortgage],
        primaryCurrency: "CAD",
      })

      expect(normalized).toMatchObject({
        id: "175329",
        name: "PM Mortgage - Apex Place 2.65%",
        type: "liability",
        isAsset: false,
        accountCurrencyBalance: 0,
        primaryCurrencyBalance: 0,
        accountCurrencyCode: "USD", // Should be USD for proper $0.00 display
        primaryCurrencyCode: "CAD",
        iconKey: "liability-loan",
      })
    })
  })

  describe("Non-zero USD accounts with proper conversion", () => {
    it("correctly converts USD to CAD with realistic exchange rates", () => {
      const usdAssetWithBalance: AssetResource = {
        id: 789,
        name: "Joint WF Checking",
        display_name: "Joint WF Checking",
        type_name: "checking",
        subtype_name: "checking",
        institution_name: "Wells Fargo",
        status: "active",
        is_manual: false,
        is_liability: false,
        balance: "34267.64", // USD account balance
        to_base: 47772.69, // CAD primary currency equivalent (rate ~1.3941)
        currency: "USD",
        last_autosync: "2025-01-01T10:00:00Z",
        updated_at: null,
      }

      const [normalized] = normalizeAccounts({
        assets: [usdAssetWithBalance],
        primaryCurrency: "CAD",
      })

      expect(normalized).toMatchObject({
        id: "789",
        name: "Joint WF Checking",
        accountCurrencyBalance: 34267.64, // USD amount
        primaryCurrencyBalance: 47772.69, // CAD converted amount
        accountCurrencyCode: "USD",
        primaryCurrencyCode: "CAD",
      })

      // Verify exchange rate calculation (should be ~1.3941)
      const exchangeRate = normalized.primaryCurrencyBalance / normalized.accountCurrencyBalance
      expect(exchangeRate).toBeCloseTo(1.3941, 3)
    })

    it("correctly handles CAD accounts (no conversion needed)", () => {
      const cadAsset: AssetResource = {
        id: 123,
        name: "Joint RBC Chequing",
        display_name: "Joint RBC Chequing",
        type_name: "checking",
        subtype_name: "checking", 
        institution_name: "RBC Royal Bank",
        status: "active",
        is_manual: false,
        is_liability: false,
        balance: "101067.12", // CAD balance
        to_base: 101067.12, // Same as balance for CAD->CAD
        currency: "CAD",
        last_autosync: "2025-01-01T10:00:00Z",
        updated_at: null,
      }

      const [normalized] = normalizeAccounts({
        assets: [cadAsset],
        primaryCurrency: "CAD",
      })

      expect(normalized).toMatchObject({
        id: "123",
        name: "Joint RBC Chequing",
        accountCurrencyBalance: 101067.12,
        primaryCurrencyBalance: 101067.12, // Should be identical for CAD->CAD
        accountCurrencyCode: "CAD",
        primaryCurrencyCode: "CAD",
      })

      // Verify 1:1 exchange rate for same currency
      const exchangeRate = normalized.primaryCurrencyBalance / normalized.accountCurrencyBalance
      expect(exchangeRate).toBe(1.0)
    })
  })

  describe("Currency code edge cases", () => {
    it("falls back to primary currency when asset currency is missing", () => {
      const assetWithoutCurrency: AssetResource = {
        id: 999,
        name: "Manual Asset",
        display_name: null,
        type_name: "cash",
        subtype_name: "other",
        institution_name: null,
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
        primaryCurrency: "CAD",
      })

      expect(normalized).toMatchObject({
        id: "999",
        name: "Manual Asset",
        accountCurrencyCode: "CAD", // Should fallback to primary currency
        primaryCurrencyCode: "CAD",
      })
    })

    it("handles Plaid account currency fallback chain", () => {
      const plaidWithPartialCurrency: PlaidAccountResource = {
        id: 777,
        name: "Test Account",
        display_name: null,
        mask: "1234",
        type: "depository",
        accountType: "checking",
        institution_name: "Test Bank",
        status: "active",
        balance: "500.00",
        to_base: 675.00,
        // currency missing, should fall back to primary currency
        last_autosync: "2025-01-01T08:00:00Z",
      }

      const [normalized] = normalizeAccounts({
        plaidAccounts: [plaidWithPartialCurrency],
        primaryCurrency: "CAD",
      })

      expect(normalized).toMatchObject({
        id: "777",
        name: "Test Account",
        accountCurrencyCode: "CAD", // Should use primary currency as fallback when currency missing
        primaryCurrencyCode: "CAD",
      })
    })
  })
})
