export type ThemePreference = "system" | "light" | "dark"
export type AccentColorPreference =
  | "black"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "rose"
  | "violet"
  | "yellow"
export type AccountSortPreference = "alpha" | "balance"
export type CurrencyDisplayMode = "primary" | "account"
export type VerificationStatus = "unverified" | "verified"

export interface UserProfileSnapshot {
  name: string
  primaryCurrency: string
}

export interface StoredPreferences {
  theme: ThemePreference
  accentColor: AccentColorPreference
  accountSort: AccountSortPreference
  currencyMode: CurrencyDisplayMode
  verificationStatus: VerificationStatus
  demoMode: boolean
  profile?: UserProfileSnapshot
  lastVerifiedAt?: string
}

export type PreferenceUpdate = Partial<Omit<StoredPreferences, "profile">> & {
  profile?: UserProfileSnapshot | null
}

export interface PreferenceStorage {
  load(): Promise<StoredPreferences | null>
  save(preferences: StoredPreferences): Promise<void>
  patch(update: PreferenceUpdate): Promise<StoredPreferences>
  clear(): Promise<void>
}

export interface SecureStorage {
  readApiKey(): Promise<string | null>
  writeApiKey(value: string): Promise<void>
  deleteApiKey(): Promise<void>
}

export interface StorageAdapters {
  preferences: PreferenceStorage
  secure: SecureStorage
}

export const DEFAULT_PREFERENCES: StoredPreferences = {
  theme: "system",
  accentColor: "black",
  accountSort: "alpha",
  currencyMode: "primary",
  verificationStatus: "unverified",
  demoMode: false,
}
