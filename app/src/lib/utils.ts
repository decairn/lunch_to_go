import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a currency value using Intl.NumberFormat with locale based on primary currency.
 * @param value - The numeric value to format
 * @param currency - The currency code (e.g., 'USD', 'CAD')
 * @param primaryCurrency - The primary currency code, defaults to 'USD'
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string, primaryCurrency: string = "USD") {
  // Use locale that matches the primary currency to make it the 'home' currency
  // CAD primary users get en-CA locale ($ for CAD, US$ for USD)
  // USD primary users get en-US locale ($ for USD, CA$ for CAD)
  const locale = primaryCurrency.toUpperCase() === "CAD" ? "en-CA" : "en-US"

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formats a currency value with precise (4 decimal places) using Intl.NumberFormat.
 * @param value - The numeric value to format
 * @param currency - The currency code (e.g., 'USD', 'CAD')
 * @param primaryCurrency - The primary currency code, defaults to 'USD'
 * @returns Formatted currency string with 4 decimal places
 */
export function formatCurrencyPrecise(value: number, currency: string, primaryCurrency: string = "USD") {
  // Use locale that matches the primary currency to make it the 'home' currency
  // CAD primary users get en-CA locale ($ for CAD, US$ for USD)
  // USD primary users get en-US locale ($ for USD, CA$ for CAD)
  const locale = primaryCurrency.toUpperCase() === "CAD" ? "en-CA" : "en-US"

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
}

/**
 * Converts a string to title case.
 * @param name - The string to convert
 * @returns Title-cased string
 */
export function titleCaseName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Formats a tooltip for currency conversion details.
 * @param primaryCurrencyBalance - Balance in primary currency
 * @param primaryCurrencyCode - Primary currency code
 * @param accountCurrencyBalance - Balance in account currency
 * @param accountCurrencyCode - Account currency code
 * @returns Formatted tooltip string
 */
export function formatConversionTooltip(
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
