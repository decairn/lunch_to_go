import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import {
  DEFAULT_PREFERENCES,
  type PreferenceStorage,
  type PreferenceUpdate,
  type SecureStorage,
  type StoredPreferences,
} from "./types"

interface SecureRecord {
  iv: ArrayBuffer
  cipher: ArrayBuffer
}

interface LunchToGoDB extends DBSchema {
  preferences: {
    key: string
    value: StoredPreferences
  }
  secure: {
    key: string
    value: SecureRecord
  }
  cryptoKeys: {
    key: string
    value: CryptoKey
  }
}

const DB_NAME = "lunch-to-go"
const DB_VERSION = 1
const PREFERENCES_STORE = "preferences"
const SECURE_STORE = "secure"
const CRYPTO_KEYS_STORE = "cryptoKeys"
const PREFERENCES_KEY = "preferences"
const API_KEY_RECORD = "api-key"
const CRYPTO_KEY_ID = "api-key"

let dbPromise: Promise<IDBPDatabase<LunchToGoDB>> | null = null


function resolveWebCrypto(): Crypto | null {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto
  }

  if (typeof globalThis !== "undefined") {
    const globalCrypto = (globalThis as { crypto?: Crypto }).crypto
    if (globalCrypto?.subtle) {
      return globalCrypto
    }

    const nodeWebCrypto = (globalThis as { webcrypto?: Crypto }).webcrypto
    if (nodeWebCrypto?.subtle) {
      return nodeWebCrypto
    }
  }

  return null
}

function requireWebCrypto(): Crypto {
  const crypto = resolveWebCrypto()
  if (!crypto) {
    throw new Error("WebCrypto is not available in this environment")
  }

  return crypto
}

function ensureBrowserEnvironment() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment")
  }

  if (!resolveWebCrypto()) {
    throw new Error("WebCrypto is not available in this environment")
  }
}

async function getDatabase(): Promise<IDBPDatabase<LunchToGoDB>> {
  if (dbPromise) {
    return dbPromise
  }

  ensureBrowserEnvironment()

  dbPromise = openDB<LunchToGoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
        db.createObjectStore(PREFERENCES_STORE)
      }

      if (!db.objectStoreNames.contains(SECURE_STORE)) {
        db.createObjectStore(SECURE_STORE)
      }

      if (!db.objectStoreNames.contains(CRYPTO_KEYS_STORE)) {
        db.createObjectStore(CRYPTO_KEYS_STORE)
      }
    },
  })

  return dbPromise
}

async function ensureCredentialKey(db: IDBPDatabase<LunchToGoDB>): Promise<CryptoKey> {
  const existing = await db.get(CRYPTO_KEYS_STORE, CRYPTO_KEY_ID)
  if (existing) {
    return existing
  }

  const crypto = requireWebCrypto()

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )

  await db.put(CRYPTO_KEYS_STORE, key, CRYPTO_KEY_ID)
  return key
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

async function encryptApiKey(db: IDBPDatabase<LunchToGoDB>, value: string): Promise<SecureRecord> {
  const key = await ensureCredentialKey(db)
  const crypto = requireWebCrypto()

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(value))

  return {
    iv: iv.buffer.slice(0),
    cipher,
  }
}

async function decryptApiKey(db: IDBPDatabase<LunchToGoDB>, record: SecureRecord): Promise<string> {
  const key = await ensureCredentialKey(db)
  const iv = new Uint8Array(record.iv)
  const crypto = requireWebCrypto()

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, record.cipher)
  return textDecoder.decode(decrypted)
}

function mergePreferences(
  current: StoredPreferences | null,
  update: PreferenceUpdate,
): StoredPreferences {
  const base: StoredPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(current ?? {}),
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

  return next
}

export const browserPreferenceStorage: PreferenceStorage = {
  async load() {
    const db = await getDatabase()
    const value = await db.get(PREFERENCES_STORE, PREFERENCES_KEY)
    return value ?? null
  },

  async save(preferences) {
    const db = await getDatabase()
    const tx = db.transaction(PREFERENCES_STORE, "readwrite")
    await tx.store.put(preferences, PREFERENCES_KEY)
    await tx.done
  },

  async patch(update) {
    const db = await getDatabase()
    const tx = db.transaction(PREFERENCES_STORE, "readwrite")
    const current = (await tx.store.get(PREFERENCES_KEY)) ?? null
    const next = mergePreferences(current, update)
    await tx.store.put(next, PREFERENCES_KEY)
    await tx.done
    return next
  },

  async clear() {
    const db = await getDatabase()
    const tx = db.transaction(PREFERENCES_STORE, "readwrite")
    await tx.store.delete(PREFERENCES_KEY)
    await tx.done
  },
}

export const browserSecureStorage: SecureStorage = {
  async readApiKey() {
    const db = await getDatabase()
    const record = await db.get(SECURE_STORE, API_KEY_RECORD)
    if (!record) {
      return null
    }

    try {
      return await decryptApiKey(db, record)
    } catch (error) {
      console.error("Failed to decrypt API key", error)
      await db.delete(SECURE_STORE, API_KEY_RECORD)
      return null
    }
  },

  async writeApiKey(value) {
    if (!value) {
      throw new Error("API key value must be a non-empty string")
    }

    const db = await getDatabase()
    const record = await encryptApiKey(db, value)
    const tx = db.transaction(SECURE_STORE, "readwrite")
    await tx.store.put(record, API_KEY_RECORD)
    await tx.done
  },

  async deleteApiKey() {
    const db = await getDatabase()
    const tx = db.transaction(SECURE_STORE, "readwrite")
    await tx.store.delete(API_KEY_RECORD)
    await tx.done
  },
}
