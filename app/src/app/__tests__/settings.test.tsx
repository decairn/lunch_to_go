import React from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PropsWithChildren } from "react"
import HomePage from "../page"
import { useAppStore } from "@/lib/state"
import * as api from "@/lib/api"
import type { ApiClient, MeProfile } from "@/lib/api"

const toastSpies = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: toastSpies,
}))

const storageMocks = vi.hoisted(() => {
  const DEFAULT_PREFERENCES_VALUE = {
    theme: "system" as const,
    accentColor: "black" as const,
    accountSort: "alpha" as const,
    currencyMode: "primary" as const,
    verificationStatus: "unverified" as const,
    demoMode: false,
  }

  const state = {
    storedPreferences: null as (typeof DEFAULT_PREFERENCES_VALUE & {
      profile?: { name: string; primaryCurrency: string }
      lastVerifiedAt?: string
      verificationStatus?: "verified" | "unverified"
      accentColor?: typeof DEFAULT_PREFERENCES_VALUE.accentColor
    }) | null,
    storedApiKey: null as string | null,
  }

  const preferenceStorageMock = {
    load: vi.fn(async () => state.storedPreferences),
    save: vi.fn(async (prefs: typeof state.storedPreferences) => {
      state.storedPreferences = prefs ? { ...prefs } : null
    }),
    patch: vi.fn(async (update) => {
      const base = state.storedPreferences ?? DEFAULT_PREFERENCES_VALUE
      const next = {
        ...DEFAULT_PREFERENCES_VALUE,
        ...base,
        ...update,
      }

      if (update?.profile === null) {
        delete next.profile
      }

      if (update?.profile) {
        next.profile = update.profile
      }

      state.storedPreferences = next
      return next
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
  DEFAULT_PREFERENCES: storageMocks.DEFAULT_PREFERENCES_VALUE,
  getPreferenceStorage: () => storageMocks.preferenceStorageMock,
  getSecureStorage: () => storageMocks.secureStorageMock,
}))

type TestProvidersProps = PropsWithChildren

const queryClients: QueryClient[] = []

function TestProviders({ children }: TestProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClients.push(queryClient)

  return (
    <NextThemesProvider attribute="class" defaultTheme="light">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NextThemesProvider>
  )
}

function renderSettingsPage() {
  return render(<HomePage />, { wrapper: TestProviders })
}

async function waitForHydration() {
  await waitFor(() => {
    if (!useAppStore.getState().hydrated) {
      throw new Error("not hydrated")
    }
  })
}

describe("Settings page interactions", () => {
  beforeEach(() => {
    storageMocks.state.storedPreferences = null
    storageMocks.state.storedApiKey = null
    useAppStore.setState({
      hydrated: false,
      preferences: storageMocks.DEFAULT_PREFERENCES_VALUE,
      actions: useAppStore.getState().actions,
    })
    toastSpies.success.mockReset()
    toastSpies.error.mockReset()
  })

  afterEach(() => {
    cleanup()
    queryClients.splice(0).forEach((client) => client.clear())
    vi.restoreAllMocks()
  })

  it("shows validation message when connecting without API key", async () => {
    const user = userEvent.setup()
    renderSettingsPage()

    await waitForHydration()

    await user.click(screen.getByRole("button", { name: /connect/i }))

    expect(await screen.findByText(/Enter your Lunch Money API key/)).toBeInTheDocument()
  })

  it("verifies API key successfully and updates store", async () => {
    const user = userEvent.setup()
    const meProfile: MeProfile = { name: "jamie demo", primaryCurrency: "usd" }
    const fetchMeSpy = vi.spyOn(api, "fetchMe").mockResolvedValue(meProfile)
    const clientStub: ApiClient = { request: vi.fn(), get: vi.fn() }
    vi.spyOn(api, "createApiClient").mockReturnValue(clientStub)

    renderSettingsPage()
    await waitForHydration()

    await user.type(screen.getByLabelText(/Lunch Money API key/i), "test-key")
    await user.click(screen.getByRole("button", { name: /connect/i }))

    await waitFor(() => expect(fetchMeSpy).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(toastSpies.success).toHaveBeenCalled())
    await waitFor(() =>
      expect(useAppStore.getState().preferences.verificationStatus).toBe("verified"),
    )
    expect(useAppStore.getState().preferences.profile).toEqual({
      name: "Jamie Demo",
      primaryCurrency: "USD",
    })
  })

  it("updates accent color selection and applies it immediately", async () => {
    const user = userEvent.setup()

    renderSettingsPage()
    await waitForHydration()

    const accentTrigger = screen.getByLabelText(/Accent color/i)
    await user.click(accentTrigger)
    await user.keyboard("{ArrowDown>6}{Enter}")

    await waitFor(() => {
      expect(useAppStore.getState().preferences.accentColor).toBe("violet")
    })

    expect(document.documentElement.getAttribute("data-accent")).toBe("violet")
  })

  it("surfaces error messaging when verification fails", async () => {
    const user = userEvent.setup()
    vi.spyOn(api, "fetchMe").mockRejectedValue(new api.NetworkError("failed"))
    const clientStub: ApiClient = { request: vi.fn(), get: vi.fn() }
    vi.spyOn(api, "createApiClient").mockReturnValue(clientStub)

    renderSettingsPage()
    await waitForHydration()

    await user.type(screen.getByLabelText(/Lunch Money API key/i), "bad-key")
    await user.click(screen.getByRole("button", { name: /connect/i }))

    await waitFor(() => expect(toastSpies.error).toHaveBeenCalled())
    const [networkTitle, networkOptions] = toastSpies.error.mock.calls[0]
    expect(networkTitle).toMatch(/Connectivity issue/i)
    expect(networkOptions?.description).toMatch(/unable to reach Lunch Money/i)
    expect(useAppStore.getState().preferences.verificationStatus).toBe("unverified")
  })

  it("clarifies authentication failures for invalid API keys", async () => {
    const user = userEvent.setup()
    vi.spyOn(api, "fetchMe").mockRejectedValue(
      new api.AuthenticationError("Authentication failed", { status: 401 }),
    )
    const clientStub: ApiClient = { request: vi.fn(), get: vi.fn() }
    vi.spyOn(api, "createApiClient").mockReturnValue(clientStub)

    renderSettingsPage()
    await waitForHydration()

    await user.type(screen.getByLabelText(/Lunch Money API key/i), "bad-key")
    await user.click(screen.getByRole("button", { name: /connect/i }))

    await waitFor(() => expect(toastSpies.error).toHaveBeenCalled())
    const [title, options] = toastSpies.error.mock.calls[0]
    expect(title).toMatch(/Authentication failed/i)
    expect(options?.description).toMatch(/Authentication error:/i)

    expect(useAppStore.getState().preferences.verificationStatus).toBe("unverified")
  })

  it("automatically routes to Accounts tab when API key is verified", async () => {
    // Setup: Start with verified state
    storageMocks.state.storedPreferences = Object.assign({}, storageMocks.DEFAULT_PREFERENCES_VALUE, {
      verificationStatus: "verified" as const,
      profile: { name: "John Doe", primaryCurrency: "USD" },
      lastVerifiedAt: new Date().toISOString(),
    })
    storageMocks.state.storedApiKey = "valid-api-key"

    const mockClient = {
      get: vi.fn().mockResolvedValue({
        user_name: "John Doe",
        primary_currency: "USD",
        user_email: "john@example.com",
        user_id: 123,
        account_id: 456,
        budget_name: "My Budget",
        api_key_label: "My API Key",
      }),
      request: vi.fn(),
    } as unknown as ApiClient

    vi.spyOn(api, "createApiClient").mockReturnValue(mockClient)

    render(<HomePage />, { wrapper: TestProviders })

    // Wait for hydration and state loading
    await waitFor(() => {
      expect(screen.getByRole("tablist")).toBeInTheDocument()
    })

    // Check that the Accounts tab is selected by default when verified
    const accountsTab = screen.getByRole("tab", { name: /accounts/i })
    expect(accountsTab).toHaveAttribute("data-state", "active")

    // And Settings tab should not be active
    const settingsTab = screen.getByRole("tab", { name: /settings/i })
    expect(settingsTab).toHaveAttribute("data-state", "inactive")
  })

  it("automatically routes to Settings tab when API key is not verified", async () => {
    // Setup: Start with unverified state
    storageMocks.state.storedPreferences = Object.assign({}, storageMocks.DEFAULT_PREFERENCES_VALUE, {
      verificationStatus: "unverified" as const,
    })
    storageMocks.state.storedApiKey = null

    render(<HomePage />, { wrapper: TestProviders })

    // Wait for hydration and state loading
    await waitFor(() => {
      expect(screen.getByRole("tablist")).toBeInTheDocument()
    })

    // Check that the Settings tab is selected by default when unverified
    const settingsTab = screen.getByRole("tab", { name: /settings/i })
    expect(settingsTab).toHaveAttribute("data-state", "active")

    // And Accounts tab should not be active
    const accountsTab = screen.getByRole("tab", { name: /accounts/i })
    expect(accountsTab).toHaveAttribute("data-state", "inactive")
  })

})








