import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type ThemePreference = "system" | "light" | "dark"
type AccountSortPreference = "alpha" | "balance"
type CurrencyDisplayMode = "primary" | "account"
type VerificationStatus = "unverified" | "verified"
type AccentColorPreference = "black" | "blue" | "green" | "orange" | "red" | "rose" | "violet" | "yellow"

type UserProfileSnapshot = {
  name: string
  primaryCurrency: string
}

type StoredPreferences = {
  theme: ThemePreference
  accentColor: AccentColorPreference
  accountSort: AccountSortPreference
  currencyMode: CurrencyDisplayMode
  verificationStatus: VerificationStatus
  demoMode: boolean
  profile?: UserProfileSnapshot
  lastVerifiedAt?: string
}

type PreferenceUpdate = Partial<Omit<StoredPreferences, "profile">> & {
  profile?: UserProfileSnapshot | null
}

const mocks = vi.hoisted(() => {
  const DEFAULT_PREFERENCES_VALUE: StoredPreferences = {
    theme: "system",
    accentColor: "black",
    accountSort: "alpha",
    currencyMode: "primary",
    verificationStatus: "unverified",
    demoMode: false,
  }

  const state = {
    storedPreferences: null as StoredPreferences | null,
    storedApiKey: null as string | null,
  }

  const preferenceStorageMock = {
    load: vi.fn(async () => state.storedPreferences),
    save: vi.fn(async (prefs: StoredPreferences) => {
      state.storedPreferences = { ...prefs }
    }),
    patch: vi.fn(async (update: PreferenceUpdate) => {
      const base = state.storedPreferences ?? DEFAULT_PREFERENCES_VALUE
      const next = {
        ...DEFAULT_PREFERENCES_VALUE,
        ...base,
        ...update,
      }

      if (update.profile === null) {
        delete next.profile
      }

      if (update.profile) {
        next.profile = update.profile
      }

      state.storedPreferences = next as StoredPreferences
      return next as StoredPreferences
    }),
    clear: vi.fn(async () => {
      state.storedPreferences = null
    }),
  }

  const secureStorageMock = {
    readApiKey: vi.fn(async () => state.storedApiKey),
    writeApiKey: vi.fn(async (value: string) => {
      state.storedApiKey = value
    }),
    deleteApiKey: vi.fn(async () => {
      state.storedApiKey = null
    }),
  }

  return {
    DEFAULT_PREFERENCES_VALUE,
    state,
    preferenceStorageMock,
    secureStorageMock,
  }
})

vi.mock("@/lib/storage", () => ({
  DEFAULT_PREFERENCES: mocks.DEFAULT_PREFERENCES_VALUE,
  getPreferenceStorage: () => mocks.preferenceStorageMock,
  getSecureStorage: () => mocks.secureStorageMock,
}))

import { useAppStore } from "../app-store"

describe("useAppStore", () => {
  beforeEach(() => {
    mocks.state.storedPreferences = null
    mocks.state.storedApiKey = null
    vi.clearAllMocks()
    useAppStore.setState({ hydrated: false, preferences: mocks.DEFAULT_PREFERENCES_VALUE })
  })

  afterEach(() => {
    useAppStore.setState({ hydrated: false, preferences: mocks.DEFAULT_PREFERENCES_VALUE })
  })

  it("hydrates preferences from storage", async () => {
    mocks.state.storedPreferences = {
      ...mocks.DEFAULT_PREFERENCES_VALUE,
      theme: "dark",
    }

    await useAppStore.getState().actions.hydrate()

    expect(useAppStore.getState().hydrated).toBe(true)
    expect(useAppStore.getState().preferences.theme).toBe("dark")
    expect(mocks.preferenceStorageMock.load).toHaveBeenCalled()
  })

  it("updates theme preference and persists it", async () => {
    await useAppStore.getState().actions.setTheme("dark")

    expect(useAppStore.getState().preferences.theme).toBe("dark")
    expect(mocks.preferenceStorageMock.patch).toHaveBeenCalledWith({ theme: "dark" })
  })

  it("updates accent color preference and persists it", async () => {
    await useAppStore.getState().actions.setAccentColor("violet")

    expect(useAppStore.getState().preferences.accentColor).toBe("violet")
    expect(mocks.preferenceStorageMock.patch).toHaveBeenCalledWith({ accentColor: "violet" })

    useAppStore.setState({ hydrated: false, preferences: mocks.DEFAULT_PREFERENCES_VALUE })
    await useAppStore.getState().actions.hydrate()

    expect(useAppStore.getState().preferences.accentColor).toBe("violet")
  })

  it("updates account sort preference and loads persisted value", async () => {
    await useAppStore.getState().actions.setAccountSort("balance")

    expect(useAppStore.getState().preferences.accountSort).toBe("balance")
    expect(mocks.preferenceStorageMock.patch).toHaveBeenCalledWith({ accountSort: "balance" })

    useAppStore.setState({ hydrated: false, preferences: mocks.DEFAULT_PREFERENCES_VALUE })
    await useAppStore.getState().actions.hydrate()

    expect(useAppStore.getState().preferences.accountSort).toBe("balance")
  })

  it("updates currency mode preference and loads persisted value", async () => {
    await useAppStore.getState().actions.setCurrencyMode("account")

    expect(useAppStore.getState().preferences.currencyMode).toBe("account")
    expect(mocks.preferenceStorageMock.patch).toHaveBeenCalledWith({ currencyMode: "account" })

    useAppStore.setState({ hydrated: false, preferences: mocks.DEFAULT_PREFERENCES_VALUE })
    await useAppStore.getState().actions.hydrate()

    expect(useAppStore.getState().preferences.currencyMode).toBe("account")
  })

  it("saves verification data and API key", async () => {
    const profile: UserProfileSnapshot = { name: "Jamie Demo", primaryCurrency: "USD" }

    await useAppStore
      .getState()
      .actions.setVerification("verified", profile, { apiKey: "demo-key", verifiedAt: "2025-10-02T00:00:00Z" })

    expect(mocks.secureStorageMock.writeApiKey).toHaveBeenCalledWith("demo-key")
    expect(useAppStore.getState().preferences.profile).toEqual(profile)
    expect(useAppStore.getState().preferences.verificationStatus).toBe("verified")
    expect(useAppStore.getState().preferences.lastVerifiedAt).toBe("2025-10-02T00:00:00Z")
  })

  it("resets verification and clears stored key", async () => {
    mocks.state.storedApiKey = "demo-key"
    mocks.state.storedPreferences = {
      ...mocks.DEFAULT_PREFERENCES_VALUE,
      verificationStatus: "verified",
      profile: { name: "Jamie Demo", primaryCurrency: "USD" },
    }

    await useAppStore.getState().actions.resetVerification()

    expect(useAppStore.getState().preferences.verificationStatus).toBe("unverified")
    expect(useAppStore.getState().preferences.profile).toBeUndefined()
    expect(mocks.secureStorageMock.deleteApiKey).toHaveBeenCalled()
  })

  it("toggles demo mode and persists it", async () => {
    await useAppStore.getState().actions.setDemoMode(true)

    expect(useAppStore.getState().preferences.demoMode).toBe(true)
    expect(mocks.preferenceStorageMock.patch).toHaveBeenCalledWith({ demoMode: true })

    await useAppStore.getState().actions.setDemoMode(false)

    expect(useAppStore.getState().preferences.demoMode).toBe(false)
    expect(mocks.preferenceStorageMock.patch).toHaveBeenCalledWith({ demoMode: false })
  })
})
