import { invoke } from "@tauri-apps/api/core"
import { isDesktopApp } from "@/lib/api/platform"
import { logWarningEvent } from "@/lib/telemetry"

const LUNCH_MONEY_ACCOUNTS_URL = "https://my.lunchmoney.app/accounts"

/**
 * Opens the Lunch Money accounts page in a new browser tab (web)
 * or the system browser (desktop).
 */
export async function openLunchMoneyAccountsPage(): Promise<void> {
  if (typeof window === "undefined") {
    return
  }

  const launchedViaDesktop = await tryOpenViaDesktop()
  if (launchedViaDesktop) {
    return
  }

  if (typeof window.open === "function") {
    window.open(LUNCH_MONEY_ACCOUNTS_URL, "_blank", "noopener,noreferrer")
    return
  }

  window.location.href = LUNCH_MONEY_ACCOUNTS_URL
}

async function tryOpenViaDesktop(): Promise<boolean> {
  try {
    await invoke<void>("open_lunch_money_accounts")
    return true
  } catch (error) {
    if (isDesktopApp()) {
      logWarningEvent("open-lunch-money-accounts-fallback", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return false
  }
}
