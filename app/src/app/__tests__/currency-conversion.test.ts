import { describe, expect, it } from "vitest"

// Extract the function for testing - in a real app this would be moved to a utils file
function formatConversionTooltip(
  primaryCurrencyBalance: number,
  primaryCurrencyCode: string,
  accountCurrencyBalance: number,
  accountCurrencyCode: string
): string {
  // Calculate exchange rate: to_base / balance (primary currency amount / account currency amount)
  // This gives us how many primary currency units per 1 account currency unit
  const exchangeRate = accountCurrencyBalance !== 0 
    ? (primaryCurrencyBalance / accountCurrencyBalance)
    : 1
  
  // Format amounts with 2 decimal places, but exchange rate with 4 decimal places for precision
  // Use primaryCurrencyCode as the 'home' currency for formatting
  const convertedAmount = formatCurrency(primaryCurrencyBalance, primaryCurrencyCode, primaryCurrencyCode)
  const oneAccountUnit = formatCurrency(1, accountCurrencyCode, primaryCurrencyCode)
  const exchangeRatePrecise = formatCurrencyPrecise(exchangeRate, primaryCurrencyCode, primaryCurrencyCode)
  
  return `Converted to ${convertedAmount} at ${oneAccountUnit} = ${exchangeRatePrecise}`
}

function formatCurrency(amount: number, currencyCode: string, primaryCurrency: string = "USD"): string {
  // Use locale that matches the primary currency to make it the 'home' currency
  // CAD primary users get en-CA locale ($ for CAD, US$ for USD)
  // USD primary users get en-US locale ($ for USD, CA$ for CAD)
  const locale = primaryCurrency.toUpperCase() === "CAD" ? "en-CA" : "en-US"
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatCurrencyPrecise(amount: number, currencyCode: string, primaryCurrency: string = "USD"): string {
  // Use locale that matches the primary currency to make it the 'home' currency
  // CAD primary users get en-CA locale ($ for CAD, US$ for USD)
  // USD primary users get en-US locale ($ for USD, CA$ for CAD)
  const locale = primaryCurrency.toUpperCase() === "CAD" ? "en-CA" : "en-US"
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount)
}

describe("formatConversionTooltip", () => {
  it("formats USD to CAD conversion correctly", () => {
    const tooltip = formatConversionTooltip(
      47772.69, // CAD primary currency balance
      "CAD",
      34267.64, // USD account currency balance
      "USD"
    )

    expect(tooltip).toBe(
      "Converted to $47,772.69 at US$1.00 = $1.3941"
    )
  })

  it("formats CAD to CAD conversion (same currency)", () => {
    const tooltip = formatConversionTooltip(
      1200.50, // CAD primary currency balance
      "CAD",
      1200.50, // CAD account currency balance
      "CAD"
    )

    expect(tooltip).toBe(
      "Converted to $1,200.50 at $1.00 = $1.0000"
    )
  })

  it("handles zero account balance without division by zero", () => {
    const tooltip = formatConversionTooltip(
      0, // CAD primary currency balance
      "CAD",
      0, // USD account currency balance  
      "USD"
    )

    expect(tooltip).toBe(
      "Converted to $0.00 at US$1.00 = $1.0000"
    )
  })

  it("formats small amounts correctly", () => {
    const tooltip = formatConversionTooltip(
      35.01, // CAD primary currency balance
      "CAD",
      25.11, // USD account currency balance
      "USD"
    )

    expect(tooltip).toBe(
      "Converted to $35.01 at US$1.00 = $1.3943"
    )
  })

  it("handles negative amounts (for liabilities)", () => {
    const tooltip = formatConversionTooltip(
      -1394.30, // CAD primary currency balance
      "CAD",
      -1000.00, // USD account currency balance
      "USD"
    )

    expect(tooltip).toBe(
      "Converted to -$1,394.30 at US$1.00 = $1.3943"
    )
  })

  it("formats large amounts with proper thousand separators", () => {
    const tooltip = formatConversionTooltip(
      307249.60, // CAD primary currency balance
      "CAD",
      220392.01, // USD account currency balance
      "USD"
    )

    expect(tooltip).toBe(
      "Converted to $307,249.60 at US$1.00 = $1.3941"
    )
  })

  it("handles EUR currency", () => {
    const tooltip = formatConversionTooltip(
      1350.00, // CAD primary currency balance
      "CAD",
      1000.00, // EUR account currency balance
      "EUR"
    )

    expect(tooltip).toBe(
      "Converted to $1,350.00 at €1.00 = $1.3500"
    )
  })

  describe("Primary Currency Scenarios", () => {
    it("formats correctly for CAD primary currency users", () => {
      // Current tests above are all CAD primary - CAD should show as $, USD as US$
      const tooltip = formatConversionTooltip(
        47772.69, // CAD primary currency balance
        "CAD",
        34267.64, // USD account currency balance
        "USD"
      )
      expect(tooltip).toBe("Converted to $47,772.69 at US$1.00 = $1.3941")
    })

    it("formats correctly for USD primary currency users", () => {
      // USD primary - USD should show as $, CAD as CA$
      const tooltip = formatConversionTooltip(
        34267.64, // USD primary currency balance
        "USD", 
        47772.69, // CAD account currency balance
        "CAD"
      )
      expect(tooltip).toBe("Converted to $34,267.64 at CA$1.00 = $0.7173")
    })

    it("displays primary currency amounts with clean symbols", () => {
      // CAD primary user
      expect(formatCurrency(1000, "CAD", "CAD")).toBe("$1,000.00")  // Clean $
      expect(formatCurrency(1000, "USD", "CAD")).toBe("US$1,000.00")  // Prefixed

      // USD primary user  
      expect(formatCurrency(1000, "USD", "USD")).toBe("$1,000.00")  // Clean $
      expect(formatCurrency(1000, "CAD", "USD")).toBe("CA$1,000.00")  // Prefixed
    })
  })
})

describe("formatCurrency", () => {
  it("formats USD amounts correctly", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56")
    expect(formatCurrency(0, "USD")).toBe("$0.00")
    expect(formatCurrency(-500.25, "USD")).toBe("-$500.25")
  })

  it("formats CAD amounts correctly", () => {
    expect(formatCurrency(1234.56, "CAD")).toBe("CA$1,234.56")
    expect(formatCurrency(0, "CAD")).toBe("CA$0.00")
  })

  it("formats EUR amounts correctly", () => {
    expect(formatCurrency(1234.56, "EUR")).toBe("€1,234.56")
  })

  it("formats GBP amounts correctly", () => {
    expect(formatCurrency(1234.56, "GBP")).toBe("£1,234.56")
  })

  it("handles unknown currencies with fallback", () => {
    const chfResult = formatCurrency(1234.56, "CHF")
    const jpyResult = formatCurrency(1234.56, "JPY")
    
    // Just verify they contain the expected currency symbols and amounts
    expect(chfResult).toContain("CHF")
    expect(chfResult).toContain("1,234.56")
    expect(jpyResult).toContain("¥")
    expect(jpyResult).toContain("1,234.56")
  })

  it("formats large amounts with thousand separators", () => {
    expect(formatCurrency(1234567.89, "USD")).toBe("$1,234,567.89")
    expect(formatCurrency(47772.69, "CAD")).toBe("CA$47,772.69")
  })
})