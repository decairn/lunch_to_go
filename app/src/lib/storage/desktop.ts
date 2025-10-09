import { invoke } from "@tauri-apps/api/core"
import { DEFAULT_PREFERENCES, type PreferenceStorage, type PreferenceUpdate, type SecureStorage, type StoredPreferences } from "./types"

let preferenceCache: StoredPreferences | null = null

function applyPreferenceUpdate(update: PreferenceUpdate): StoredPreferences {
  const base: StoredPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(preferenceCache ?? {}),
  }

  // Extract profile from update to handle it separately
  const { profile, ...updateWithoutProfile } = update

  const next: StoredPreferences = {
    ...base,
    ...updateWithoutProfile,
  }

  // Handle profile field specially since it can be null in the update
  if (profile === null) {
    delete next.profile
  } else if (profile) {
    next.profile = profile
  }
  // If profile is undefined, keep the existing profile from base

  preferenceCache = next
  return next
}

export const desktopPreferenceStorage: PreferenceStorage = {
  async load() {
    // For now, preferences are cached in memory
    // Future enhancement: Could implement Tauri preference persistence
    return preferenceCache
  },

  async save(preferences) {
    preferenceCache = { ...preferences }
    // Future enhancement: Could persist to Tauri app config directory
  },

  async patch(update) {
    const next = applyPreferenceUpdate(update)
    // Future enhancement: Could persist to Tauri app config directory
    return next
  },

  async clear() {
    preferenceCache = null
    // Future enhancement: Could clear from Tauri app config directory
  },
}

export const desktopSecureStorage: SecureStorage = {
  async readApiKey(): Promise<string | null> {
    try {
      const result = await invoke<string | null>("read_api_key")
      return result
    } catch (error) {
      console.error("Failed to read API key from Tauri secure storage:", error)
      throw new Error(error instanceof Error ? error.message : "Failed to read API key")
    }
  },

  async writeApiKey(value: string): Promise<void> {
    try {
      await invoke<void>("store_api_key", { apiKey: value })
    } catch (error) {
      console.error("Failed to write API key to Tauri secure storage:", error)
      throw new Error(error instanceof Error ? error.message : "Failed to write API key")
    }
  },

  async deleteApiKey(): Promise<void> {
    try {
      await invoke<void>("delete_api_key")
    } catch (error) {
      console.error("Failed to delete API key from Tauri secure storage:", error)
      throw new Error(error instanceof Error ? error.message : "Failed to delete API key")
    }
  },
}
