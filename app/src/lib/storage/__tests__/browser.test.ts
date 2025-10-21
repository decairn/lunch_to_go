import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"

vi.mock("idb", () => {
  const stores = new Map<string, Map<string, unknown>>()

  const ensureStore = (name: string) => {
    let store = stores.get(name)
    if (!store) {
      store = new Map<string, unknown>()
      stores.set(name, store)
    }
    return store
  }

  const db = {
    async get(storeName: string, key: string) {
      return ensureStore(storeName).get(key)
    },
    async put(storeName: string, value: unknown, key: string) {
      ensureStore(storeName).set(key, value)
    },
    async delete(storeName: string, key: string) {
      ensureStore(storeName).delete(key)
    },
    transaction(storeName: string) {
      const store = ensureStore(storeName)
      return {
        store: {
          get: async (key: string) => store.get(key),
          put: async (value: unknown, key: string) => {
            store.set(key, value)
          },
          delete: async (key: string) => {
            store.delete(key)
          },
        },
        done: Promise.resolve(),
      }
    },
  }

  const openDB = vi.fn(async (_name: string, _version: number, options?: { upgrade?: (db: unknown) => void }) => {
    if (options?.upgrade) {
      options.upgrade({
        objectStoreNames: {
          contains(storeName: string) {
            return stores.has(storeName)
          },
        },
        createObjectStore(storeName: string) {
          ensureStore(storeName)
          return {}
        },
      } as unknown)
    }
    return db
  })

  ;(openDB as typeof openDB & { __reset?: () => void }).__reset = () => {
    stores.clear()
  }

  return { openDB }
})

import { browserPreferenceStorage, browserSecureStorage } from "../browser"
import { DEFAULT_PREFERENCES, type StoredPreferences } from "../types"
import { openDB } from "idb"

const SAMPLE_PREFERENCES: StoredPreferences = {
  ...DEFAULT_PREFERENCES,
  demoMode: true,
  verificationStatus: "verified",
  profile: {
    name: "Jess",
    primaryCurrency: "USD",
  },
}

beforeAll(() => {
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: {},
  })

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto as Crypto,
  })
})

beforeEach(async () => {
  vi.clearAllMocks()
  const openDbWithReset = openDB as typeof openDB & { __reset?: () => void }
  openDbWithReset.__reset?.()
})

describe("browserPreferenceStorage", () => {
  it("returns null when no preferences are stored", async () => {
    await expect(browserPreferenceStorage.load()).resolves.toBeNull()
  })

  it("persists preferences through save and load", async () => {
    await browserPreferenceStorage.save(SAMPLE_PREFERENCES)

    await expect(browserPreferenceStorage.load()).resolves.toEqual(SAMPLE_PREFERENCES)
  })

  it("merges updates with defaults and handles profile changes", async () => {
    const initialUpdate = await browserPreferenceStorage.patch({
      demoMode: true,
      profile: {
        name: "Avery",
        primaryCurrency: "EUR",
      },
    })

    expect(initialUpdate).toMatchObject({
      ...DEFAULT_PREFERENCES,
      demoMode: true,
      profile: {
        name: "Avery",
        primaryCurrency: "EUR",
      },
    })

    const clearedProfile = await browserPreferenceStorage.patch({ profile: null })
    expect(clearedProfile.profile).toBeUndefined()
  })

  it("clears stored preferences", async () => {
    await browserPreferenceStorage.save(SAMPLE_PREFERENCES)
    await browserPreferenceStorage.clear()

    await expect(browserPreferenceStorage.load()).resolves.toBeNull()
  })
})

describe("browserSecureStorage", () => {
  it("returns null when API key has not been stored", async () => {
    await expect(browserSecureStorage.readApiKey()).resolves.toBeNull()
  })

  it("persists encrypted API keys", async () => {
    const apiKey = "sk_test_123"
    await browserSecureStorage.writeApiKey(apiKey)

    await expect(browserSecureStorage.readApiKey()).resolves.toBe(apiKey)
  })

  it("rejects empty API key values", async () => {
    await expect(browserSecureStorage.writeApiKey("")).rejects.toThrow("non-empty")
  })

  it("removes stored API key records", async () => {
    await browserSecureStorage.writeApiKey("sk_delete")
    await browserSecureStorage.deleteApiKey()

    await expect(browserSecureStorage.readApiKey()).resolves.toBeNull()
  })

  it("returns null and purges corrupted records", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await browserSecureStorage.writeApiKey("sk_corrupted")

    const db = await openDB("lunch-to-go", 1)
    await db.put("secure", { iv: new ArrayBuffer(12), cipher: new ArrayBuffer(0) }, "api-key")

    await expect(browserSecureStorage.readApiKey()).resolves.toBeNull()
    await expect(db.get("secure", "api-key")).resolves.toBeUndefined()

    consoleSpy.mockRestore()
  })
})

describe("Storage adapter selection", () => {
  it("defaults to browser adapters outside Tauri", async () => {
    vi.resetModules()

    const { getStorageAdapters, getPreferenceStorage, getSecureStorage } = await import("../index")
    const { browserPreferenceStorage: browserPreferences, browserSecureStorage: browserSecure } = await import("../browser")

    const adapters = getStorageAdapters()

    expect(adapters.preferences).toBe(browserPreferences)
    expect(adapters.secure).toBe(browserSecure)
    expect(getPreferenceStorage()).toBe(browserPreferences)
    expect(getSecureStorage()).toBe(browserSecure)
  })

  it("switches to desktop adapters when Tauri is detected", async () => {
    vi.resetModules()
    ;(window as { __TAURI__?: unknown }).__TAURI__ = {}

    const { getStorageAdapters, getPreferenceStorage, getSecureStorage } = await import("../index")
    const { desktopPreferenceStorage, desktopSecureStorage } = await import("../desktop")

    const adapters = getStorageAdapters()

    expect(adapters.preferences).toBe(desktopPreferenceStorage)
    expect(adapters.secure).toBe(desktopSecureStorage)
    expect(getPreferenceStorage()).toBe(desktopPreferenceStorage)
    expect(getSecureStorage()).toBe(desktopSecureStorage)

    delete (window as { __TAURI__?: unknown }).__TAURI__
  })
})

