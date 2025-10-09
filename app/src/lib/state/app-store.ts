import { create } from "zustand"
import {
  DEFAULT_PREFERENCES,
  getPreferenceStorage,
  getSecureStorage,
  type AccentColorPreference,
  type AccountSortPreference,
  type CurrencyDisplayMode,
  type StoredPreferences,
  type ThemePreference,
  type UserProfileSnapshot,
  type VerificationStatus,
} from "@/lib/storage"

interface AppActions {
  hydrate: () => Promise<void>
  setTheme: (theme: ThemePreference) => Promise<void>
  setAccentColor: (accent: AccentColorPreference) => Promise<void>
  setAccountSort: (sort: AccountSortPreference) => Promise<void>
  setCurrencyMode: (mode: CurrencyDisplayMode) => Promise<void>
  setVerification: (
    status: VerificationStatus,
    profile?: UserProfileSnapshot,
    options?: { apiKey?: string; verifiedAt?: string },
  ) => Promise<void>
  resetVerification: () => Promise<void>
  loadApiKey: () => Promise<string | null>
  saveApiKey: (apiKey: string) => Promise<void>
  deleteApiKey: () => Promise<void>
  setDemoMode: (enabled: boolean) => Promise<void>
}

export interface AppStoreState {
  hydrated: boolean
  preferences: StoredPreferences
  actions: AppActions
}

const preferenceStorage = getPreferenceStorage()
const secureStorage = getSecureStorage()
let apiKeyCache: string | null = null

export const useAppStore = create<AppStoreState>((set, get) => ({
  hydrated: false,
  preferences: DEFAULT_PREFERENCES,
  actions: {
    hydrate: async () => {
      if (get().hydrated) {
        return
      }

      const stored = await preferenceStorage.load()
      const merged = stored ? { ...DEFAULT_PREFERENCES, ...stored } : DEFAULT_PREFERENCES

      set({
        hydrated: true,
        preferences: merged,
      })
    },

    setTheme: async (theme) => {
      const next = await preferenceStorage.patch({ theme })
      set({ preferences: next })
    },

    setAccentColor: async (accent) => {
      const next = await preferenceStorage.patch({ accentColor: accent })
      set({ preferences: next })
    },

    setAccountSort: async (sort) => {
      const next = await preferenceStorage.patch({ accountSort: sort })
      set({ preferences: next })
    },

    setCurrencyMode: async (mode) => {
      const next = await preferenceStorage.patch({ currencyMode: mode })
      set({ preferences: next })
    },

    setVerification: async (status, profile, options) => {
      const verifiedAt = options?.verifiedAt ?? new Date().toISOString()
      const update: Parameters<typeof preferenceStorage.patch>[0] = {
        verificationStatus: status,
        lastVerifiedAt: status === "verified" ? verifiedAt : undefined,
      }

      if (status === "verified" && profile) {
        update.profile = profile
      }

      if (status === "unverified") {
        update.profile = null
      }

      const next = await preferenceStorage.patch(update)
      set({ preferences: next })

      if (status === "verified" && options?.apiKey) {
        await secureStorage.writeApiKey(options.apiKey)
        apiKeyCache = options.apiKey
      }

      if (status === "unverified") {
        await secureStorage.deleteApiKey()
        apiKeyCache = null
      }
    },

    resetVerification: async () => {
      const next = await preferenceStorage.patch({
        verificationStatus: "unverified",
        profile: null,
        lastVerifiedAt: undefined,
      })

      set({ preferences: next })
      await secureStorage.deleteApiKey()
      apiKeyCache = null
    },

    loadApiKey: async () => {
      if (apiKeyCache) {
        return apiKeyCache
      }

      apiKeyCache = await secureStorage.readApiKey()
      return apiKeyCache
    },

    saveApiKey: async (apiKey) => {
      await secureStorage.writeApiKey(apiKey)
      apiKeyCache = apiKey
    },

    deleteApiKey: async () => {
      await secureStorage.deleteApiKey()
      apiKeyCache = null
    },

    setDemoMode: async (enabled) => {
      const next = await preferenceStorage.patch({ demoMode: enabled })
      set({ preferences: next })
    },
  },
}))
