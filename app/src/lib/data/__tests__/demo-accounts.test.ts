import { describe, expect, it } from "vitest"
import { parseDemoAccountsFromCSV } from "../demo-accounts"

describe("Demo Account Parser", () => {
  const sampleCSV = `Row Number,Asset or Liability,Account Type,Account Name,Institution,Days Since Update,Account Currency,Account Balance,Base Currency,To Base Balance
1,Asset,CASH,Joint BCB Chequing,Big Canadian Bank,0,CAD,"$9,234.84 ",CAD,"$9,234.84 "
2,Asset,INVESTMENT,Personal RRSP,Big Canadian Bank,5,CAD,"$238,487.82 ",CAD,"$238,487.82 "
3,Liability,CREDIT,Credit Card,Big US Bank,0,USD,157.12,CAD,$219.45`

  it("parses CSV into normalized accounts correctly", () => {
    const accounts = parseDemoAccountsFromCSV(sampleCSV, "CAD")
    
    expect(accounts).toHaveLength(3)
    
    // Test first account (asset)
    expect(accounts[0]).toMatchObject({
      id: "demo-1",
      name: "Joint BCB Chequing",
      accountType: "Cash",
      type: "asset",
      isAsset: true,
      source: "asset",
      institutionName: "Big Canadian Bank",
      status: "active",
      daysSinceUpdate: 0,
      primaryCurrencyBalance: 9234.84,
      accountCurrencyBalance: 9234.84,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "CAD",
      iconKey: "asset-cash",
    })

    // Test second account (investment)
    expect(accounts[1]).toMatchObject({
      id: "demo-2",
      name: "Personal RRSP",
      accountType: "Investment",
      type: "asset",
      isAsset: true,
      daysSinceUpdate: 5,
      primaryCurrencyBalance: 238487.82,
      accountCurrencyBalance: 238487.82,
      iconKey: "asset-investment",
    })

    // Test third account (liability)
    expect(accounts[2]).toMatchObject({
      id: "demo-3",
      name: "Credit Card",
      accountType: "Credit",
      type: "liability",
      isAsset: false,
      daysSinceUpdate: 0,
      primaryCurrencyBalance: 219.45,
      accountCurrencyBalance: 157.12,
      primaryCurrencyCode: "CAD",
      accountCurrencyCode: "USD",
      iconKey: "liability-credit",
    })
  })

  it("handles amounts with currency symbols and commas", () => {
    const csvWithFormats = `Row Number,Asset or Liability,Account Type,Account Name,Institution,Days Since Update,Account Currency,Account Balance,Base Currency,To Base Balance
1,Asset,CASH,Test Account,Test Bank,0,CAD,"$1,234.56",CAD,"$1,234.56"
2,Asset,CASH,No Symbol,Test Bank,0,USD,5000.00,CAD,6500.00`

    const accounts = parseDemoAccountsFromCSV(csvWithFormats, "CAD")
    
    expect(accounts[0].accountCurrencyBalance).toBe(1234.56)
    expect(accounts[0].primaryCurrencyBalance).toBe(1234.56)
    expect(accounts[1].accountCurrencyBalance).toBe(5000.00)
    expect(accounts[1].primaryCurrencyBalance).toBe(6500.00)
  })

  it("handles empty institution names", () => {
    const csvWithEmptyInstitution = `Row Number,Asset or Liability,Account Type,Account Name,Institution,Days Since Update,Account Currency,Account Balance,Base Currency,To Base Balance
1,Asset,REAL ESTATE,House - 123 Main St,,18,CAD,"$500,000.00",CAD,"$500,000.00"`

    const accounts = parseDemoAccountsFromCSV(csvWithEmptyInstitution, "CAD")
    
    expect(accounts[0].institutionName).toBeUndefined()
    expect(accounts[0].accountType).toBe("Real Estate")
    expect(accounts[0].iconKey).toBe("asset-real-estate")
  })

  it("generates lastUpdated timestamp based on days since update", () => {
    const accounts = parseDemoAccountsFromCSV(sampleCSV, "CAD")
    
    // First account with 0 days should have today's date
    expect(accounts[0].lastUpdated).toBeTruthy()
    const firstDate = new Date(accounts[0].lastUpdated!)
    const today = new Date()
    expect(firstDate.toDateString()).toBe(today.toDateString())

    // Second account with 5 days should be 5 days ago
    expect(accounts[1].lastUpdated).toBeTruthy()
    const secondDate = new Date(accounts[1].lastUpdated!)
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    expect(secondDate.toDateString()).toBe(fiveDaysAgo.toDateString())
  })

  it("uses provided primary currency for all accounts", () => {
    const accounts = parseDemoAccountsFromCSV(sampleCSV, "USD")
    
    accounts.forEach(account => {
      expect(account.primaryCurrencyCode).toBe("USD")
    })
  })

  it("maps account types correctly", () => {
    const csvWithTypes = `Row Number,Asset or Liability,Account Type,Account Name,Institution,Days Since Update,Account Currency,Account Balance,Base Currency,To Base Balance
1,Asset,CASH,Cash Account,Bank,0,CAD,1000,CAD,1000
2,Asset,INVESTMENT,Investment Account,Bank,0,CAD,1000,CAD,1000
3,Asset,REAL ESTATE,Real Estate,Bank,0,CAD,1000,CAD,1000
4,Liability,CREDIT,Credit Account,Bank,0,CAD,1000,CAD,1000
5,Liability,LOAN,Loan Account,Bank,0,CAD,1000,CAD,1000`

    const accounts = parseDemoAccountsFromCSV(csvWithTypes, "CAD")
    
    expect(accounts[0].accountType).toBe("Cash")
    expect(accounts[1].accountType).toBe("Investment")
    expect(accounts[2].accountType).toBe("Real Estate")
    expect(accounts[3].accountType).toBe("Credit")
    expect(accounts[4].accountType).toBe("Loan")
  })
})