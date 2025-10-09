import { browserPreferenceStorage, browserSecureStorage } from "./browser"
import { desktopPreferenceStorage, desktopSecureStorage } from "./desktop"
import type { PreferenceStorage, SecureStorage, StorageAdapters } from "./types"

function isTauriEnvironment() {
  return typeof window !== "undefined" && typeof (window as { __TAURI__?: unknown }).__TAURI__ !== "undefined"
}

const adapters: StorageAdapters = isTauriEnvironment()
  ? { preferences: desktopPreferenceStorage, secure: desktopSecureStorage }
  : { preferences: browserPreferenceStorage, secure: browserSecureStorage }

export function getStorageAdapters(): StorageAdapters {
  return adapters
}

export function getPreferenceStorage(): PreferenceStorage {
  return adapters.preferences
}

export function getSecureStorage(): SecureStorage {
  return adapters.secure
}

export * from "./types"
