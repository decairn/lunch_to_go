"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AccountsContentSkeleton, NetWorthContentSkeleton } from "@/components/loading-skeletons"
import { NoAccountsEmptyState } from "@/components/empty-states"
import { useAppHydration } from "@/hooks/use-app-hydration"
import { createApiClient, fetchMe, fetchAssets, fetchPlaidAccounts, getApiBaseUrl } from "@/lib/api"
import { ApiError, describeApiError, toApiError } from "@/lib/api/errors"
import { normalizeAccounts, groupAccountsByTypeAndAccountType, formatDaysSinceUpdate, getAccountIcon } from "@/lib/domain/accounts"
import { loadDemoAccountData, calculateDemoTotals, getDemoAccountsNormalized } from "@/lib/domain/demo-data"
import { useAppStore } from "@/lib/state"
import type { AccentColorPreference, AccountSortPreference, CurrencyDisplayMode, ThemePreference } from "@/lib/storage"
import { logApiErrorEvent, logWarningEvent } from "@/lib/telemetry"

const themeLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
}

const accentOptions: { value: AccentColorPreference; label: string }[] = [
  { value: "black", label: "Black" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
  { value: "rose", label: "Rose" },
  { value: "violet", label: "Violet" },
  { value: "yellow", label: "Yellow" },
]

const accentSwatches: Record<AccentColorPreference, string> = {
  black: "#18181b",
  blue: "#3b82f6",
  green: "#22c55e",
  orange: "#f97316",
  red: "#ef4444",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  yellow: "#eab308",
}

function formatCurrency(value: number, currency: string, primaryCurrency: string = "USD") {
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

function formatCurrencyPrecise(value: number, currency: string, primaryCurrency: string = "USD") {
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

function titleCaseName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ")
}

function formatConversionTooltip(
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

// Simple conversion icon component
function ConversionIcon({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <path
        d="M2 3h8M2 6h6M2 9h4"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle
        cx="10"
        cy="9"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  )
}

export default function HomePage() {
  useAppHydration()

  const { setTheme } = useTheme()
  const hydrated = useAppStore((state) => state.hydrated)
  const preferences = useAppStore((state) => state.preferences)
  const actions = useAppStore((state) => state.actions)
  const queryClient = useQueryClient()
  const applyAccent = useCallback((accent: AccentColorPreference) => {
    if (typeof document === "undefined") {
      return
    }

    document.documentElement.setAttribute("data-accent", accent)
  }, [])

  const [apiKeyInput, setApiKeyInput] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("settings")

  const loadStartMarkedRef = useRef(false)
  const loadMeasuredRef = useRef(false)

  const prepareLoadMeasurement = useCallback(() => {
    if (typeof performance === "undefined") {
      loadStartMarkedRef.current = false
      loadMeasuredRef.current = false
      return
    }

    performance.clearMarks("accounts-data-load-start")
    performance.clearMarks("accounts-data-load-end")
    performance.clearMeasures("accounts-data-load")
    loadStartMarkedRef.current = false
    loadMeasuredRef.current = false
  }, [])

  const markLoadStart = useCallback(() => {
    if (loadStartMarkedRef.current || typeof performance === "undefined") {
      return
    }

    performance.mark("accounts-data-load-start")
    loadStartMarkedRef.current = true
  }, [])

  const beginAccountsLoad = useCallback(() => {
    prepareLoadMeasurement()
    markLoadStart()
  }, [prepareLoadMeasurement, markLoadStart])

  const emitApiError = useCallback(
    (action: string, error: unknown, context?: Record<string, unknown>) => {
      const apiError = error instanceof ApiError ? error : toApiError(error)
      logApiErrorEvent(apiError, { action, context })
      return apiError
    },
    [],
  )

  // Refresh function to invalidate and refetch all relevant queries
  const handleRefresh = async () => {
    if (preferences.demoMode) {
      beginAccountsLoad()
      // For demo mode, just refetch the demo data
      await demoQuery.refetch()
      return
    }

    if (!isApiKeyVerified) {
      toast.error("API key not verified", { description: "Please verify your API key first" })
      logWarningEvent("accounts.refresh.blocked", { reason: "verification-required" })
      return
    }
    
    beginAccountsLoad()
    // Use invalidateQueries for refresh (keeps loading states)
    await queryClient.invalidateQueries({ queryKey: ["user"] })
    await queryClient.invalidateQueries({ queryKey: ["accounts"] })
  }

  useEffect(() => {
    if (localError && apiKeyInput.trim().length) {
      setLocalError(null)
    }
  }, [apiKeyInput, localError])

  useEffect(() => {
    if (hydrated) {
      setTheme(preferences.theme)
    }
  }, [hydrated, preferences.theme, setTheme])

  const verifyMutation = useMutation({
    mutationKey: ["verify-api-key"],
    mutationFn: async (apiKey: string) => {
      const client = createApiClient({ baseUrl: getApiBaseUrl() })
      const profile = await fetchMe(client, { authToken: apiKey })
      return { apiKey, profile }
    },
    onSuccess: async ({ apiKey, profile }) => {
      const normalizedProfile = {
        name: titleCaseName(profile.name),
        primaryCurrency: profile.primaryCurrency.toUpperCase(),
      }

      await actions.setVerification("verified", normalizedProfile, {
        apiKey,
        verifiedAt: new Date().toISOString(),
      })

      beginAccountsLoad()
      // Remove all previous query data to ensure fresh data after verification
      queryClient.removeQueries({ queryKey: ["user"] })
      queryClient.removeQueries({ queryKey: ["accounts"] })

      // Update local API key state immediately
      setApiKey(apiKey)

      setApiKeyInput("")
      setLocalError(null)
      toast.success("API key connected")
    },
    onError: (error) => {
      const apiError = emitApiError("auth.verify", error, { source: "verifyMutation" })
      const { title, description } = describeApiError(apiError)
      setLocalError(description)
      toast.error(title, { description })
    },
  })

  const handleVerify = () => {
    if (!apiKeyInput.trim()) {
      setLocalError("Enter your Lunch Money API key before connecting.")
      return
    }

    verifyMutation.mutate(apiKeyInput.trim())
  }

  const handleDelete = async () => {
    prepareLoadMeasurement()
    await actions.resetVerification()
    
    // Clear all queries when deleting API key - use removeQueries to completely clear data
    queryClient.removeQueries({ queryKey: ["user"] })
    queryClient.removeQueries({ queryKey: ["accounts"] })
    
    // Clear local API key state immediately
    setApiKey(null)
    
    setApiKeyInput("")
    setLocalError(null)
    toast.success("Stored credentials cleared")
  }

  const handleThemeChange = (value: ThemePreference) => {
    setTheme(value)
    void actions.setTheme(value)
  }

  const handleAccentChange = (value: AccentColorPreference) => {
    applyAccent(value)
    void actions.setAccentColor(value)
  }

  // Load API key for API requests
  const [apiKey, setApiKey] = useState<string | null>(null)
  
  useEffect(() => {
    if (hydrated && preferences.verificationStatus === "verified") {
      actions.loadApiKey().then(setApiKey)
    } else {
      setApiKey(null)
    }
  }, [hydrated, preferences.verificationStatus, actions])

  // API verification state
  const userQuery = useQuery({
    queryKey: ["user", apiKey],
    queryFn: async () => {
      const client = createApiClient({ baseUrl: getApiBaseUrl() });
      return fetchMe(client, { authToken: apiKey });
    },
    enabled: hydrated && Boolean(apiKey),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Auto-reset verification status if API key becomes invalid
  useEffect(() => {
    if (userQuery.error) {
      const apiError = emitApiError("user.fetch", userQuery.error, { source: "userQuery" })
      if (preferences.verificationStatus === "verified" && apiError.kind === "authentication") {
        // API key is invalid, reset verification status
        prepareLoadMeasurement()
        actions.resetVerification()
        toast.error("API key is no longer valid", {
          description: "Please connect your API key again in Settings"
        })
      }
    }
  }, [userQuery.error, preferences.verificationStatus, actions, emitApiError, prepareLoadMeasurement])

  const isApiKeyVerified = Boolean(userQuery.data && apiKey);

  const accountsQuery = useQuery({
    queryKey: [
      "accounts",
      apiKey, // This will change when API key is cleared/set
      userQuery.data?.name, // Include user data to invalidate on user change
      preferences.accountSort,
      preferences.currencyMode,
    ],
    enabled: hydrated && isApiKeyVerified && !preferences.demoMode,
    queryFn: async () => {
      if (!apiKey) {
        throw new Error("No API key available")
      }
      
      const client = createApiClient({ baseUrl: getApiBaseUrl() })
      
      // Fetch both asset and Plaid accounts in parallel
      const [assets, plaidAccounts] = await Promise.all([
        fetchAssets(client, { authToken: apiKey }),
        fetchPlaidAccounts(client, { authToken: apiKey })
      ])

      // Get primary currency from user query data (more reliable than preferences)
      const primaryCurrency = userQuery.data?.primaryCurrency ?? preferences.profile?.primaryCurrency ?? "USD"

      const accounts = normalizeAccounts({
        assets,
        plaidAccounts,
        primaryCurrency,
      })

      // Group accounts by type and account type with sorting
      const groupedAccounts = groupAccountsByTypeAndAccountType(accounts, preferences.accountSort)
      
      return groupedAccounts
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })

  useEffect(() => {
    if (accountsQuery.error && !preferences.demoMode) {
      emitApiError("accounts.fetch", accountsQuery.error, { source: "accountsQuery" })
    }
  }, [accountsQuery.error, preferences.demoMode, emitApiError])

  // Demo data query for when demo mode is enabled
  const demoQuery = useQuery({
    queryKey: [
      "demo-accounts",
      preferences.accountSort,
      preferences.currencyMode,
      preferences.profile?.primaryCurrency || "CAD",
    ],
    enabled: hydrated && preferences.demoMode,
    queryFn: async () => {
      const primaryCurrency = preferences.profile?.primaryCurrency ?? "CAD"
      return await loadDemoAccountData(primaryCurrency, preferences.accountSort)
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (demo data doesn't change often)
  })

  useEffect(() => {
    if (demoQuery.error && preferences.demoMode) {
      emitApiError("accounts.demo.fetch", demoQuery.error, { source: "demoQuery" })
    }
  }, [demoQuery.error, preferences.demoMode, emitApiError])

  // Combined query data - use demo data when in demo mode, otherwise use live data
  const currentAccountsData = preferences.demoMode ? demoQuery.data : accountsQuery.data
  const currentAccountsLoading = preferences.demoMode ? demoQuery.isLoading : accountsQuery.isLoading
  const currentAccountsError = preferences.demoMode ? demoQuery.error : accountsQuery.error
  const currentAccountsRefetch = preferences.demoMode ? demoQuery.refetch : accountsQuery.refetch

  const totals = useMemo(() => {
    if (!currentAccountsData) {
      return { assets: 0, liabilities: 0, net: 0 }
    }

    return currentAccountsData.reduce(
      (acc: { assets: number; liabilities: number; net: number }, typeGroup) => {
        // Sum all accounts in each account type group
        for (const accountTypeGroup of typeGroup.accountTypeGroups) {
          for (const { account } of accountTypeGroup.accounts) {
            if (account.isAsset) {
              acc.assets += account.primaryCurrencyBalance
            } else {
              acc.liabilities += account.primaryCurrencyBalance
            }
          }
        }
        // Net Worth = Assets - Liabilities
        acc.net = acc.assets - acc.liabilities
        return acc
      },
      { assets: 0, liabilities: 0, net: 0 },
    )
  }, [currentAccountsData])

  // Handle demo data totals separately since they need to be async
  const [demoTotals, setDemoTotals] = useState<{ assets: number; liabilities: number; net: number } | null>(null)
  
  useEffect(() => {
    if (preferences.demoMode && hydrated) {
      getDemoAccountsNormalized(preferences.profile?.primaryCurrency ?? "CAD")
        .then(accounts => {
          const totals = calculateDemoTotals(accounts)
          setDemoTotals(totals)
        })
        .catch(() => setDemoTotals({ assets: 0, liabilities: 0, net: 0 }))
    } else {
      setDemoTotals(null)
    }
  }, [preferences.demoMode, preferences.profile?.primaryCurrency, hydrated])

  // Use demo totals when in demo mode, otherwise use live totals
  const finalTotals = preferences.demoMode ? (demoTotals ?? { assets: 0, liabilities: 0, net: 0 }) : totals
 
  const showAccounts = hydrated && (preferences.verificationStatus === "verified" || preferences.demoMode)

  useEffect(() => {
    if (showAccounts) {
      markLoadStart()
    }
  }, [showAccounts, markLoadStart])

  // Set initial tab based on verification status
  useEffect(() => {
    if (hydrated) {
      if (preferences.verificationStatus === "verified") {
        // Switch to accounts tab when verified
        setActiveTab("accounts")
      } else {
        // Stay on settings tab when not verified
        setActiveTab("settings")
      }
    }
  }, [hydrated, preferences.verificationStatus])

  useEffect(() => {
    if (hydrated && preferences.verificationStatus === "verified") {
      beginAccountsLoad()
    }
  }, [hydrated, preferences.verificationStatus, beginAccountsLoad])

  useEffect(() => {
    if (!showAccounts) return
    if (currentAccountsLoading) return
    if (!currentAccountsData || currentAccountsData.length === 0) return
    if (loadMeasuredRef.current) return
    if (typeof performance === "undefined") return

    performance.mark("accounts-data-load-end")
    try {
    performance.measure("accounts-data-load", "accounts-data-load-start", "accounts-data-load-end")
    } catch {
      // Ignore measurement errors (e.g., missing start mark)
    }
    loadMeasuredRef.current = true
  }, [showAccounts, currentAccountsLoading, currentAccountsData])

  // Auto-refresh accounts data when switching to accounts tab after verification
  useEffect(() => {
    if (activeTab === "accounts" && showAccounts && accountsQuery.isStale) {
      accountsQuery.refetch()
    }
  }, [activeTab, showAccounts, accountsQuery])

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">Lunch To Go</p>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 border border-primary/20 bg-primary/10">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-primary">API key</CardTitle>
                <CardDescription>
                  Connect your Lunch Money subscriber key to access your data.
                  <br />
                  Go to{" "}
                  <a 
                    href="https://my.lunchmoney.app/developers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-primary/80"
                  >
                    https://my.lunchmoney.app/developers
                  </a>
                  {" "}to request a new access token.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-primary">Status</p>
                    <Badge variant={preferences.verificationStatus === "verified" ? "default" : "secondary"} className="mt-1">
                      {preferences.verificationStatus === "verified" ? "CONNECTED" : "DISCONNECTED"}
                    </Badge>
                    {preferences.lastVerifiedAt && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Since {new Date(preferences.lastVerifiedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[2fr,auto]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-primary" htmlFor="api-key-input">Lunch Money API key</label>
                    <Input
                      id="api-key-input"
                      value={apiKeyInput}
                      onChange={(event) => {
                        if (localError) {
                          setLocalError(null)
                        }
                        setApiKeyInput(event.target.value)
                      }}
                      placeholder="lunch_money_subscriber_key"
                      aria-describedby={localError ? "api-key-error" : undefined}
                      autoComplete="off"
                      spellCheck="false"
                    />
                    {localError && (
                      <p id="api-key-error" className="text-destructive text-sm">
                        {localError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:justify-end">
                    <Button
                      onClick={handleVerify}
                      className="sm:w-40"
                      disabled={verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? "Connecting..." : "Connect"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      className="sm:w-40"
                      disabled={verifyMutation.isPending || preferences.verificationStatus === "unverified"}
                    >
                      Delete stored key
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-primary">User profile</CardTitle>
                <CardDescription>
                  Once connected, we display your Lunch Money name and primary currency here.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-sm">Name</p>
                  <p className="text-lg font-semibold">
                    {preferences.profile?.name ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Primary currency</p>
                  <p className="text-lg font-semibold uppercase">
                    {preferences.profile?.primaryCurrency ?? "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-primary">Preferences</CardTitle>
                <CardDescription>Choose how the app looks.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary" htmlFor="theme-select">Theme</label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) => handleThemeChange(value as ThemePreference)}
                  >
                    <SelectTrigger id="theme-select" aria-label="Theme preference">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(themeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary" htmlFor="accent-select">Accent color</label>
                  <Select
                    value={preferences.accentColor}
                    onValueChange={(value) => handleAccentChange(value as AccentColorPreference)}
                  >
                    <SelectTrigger id="accent-select" aria-label="Accent color preference">
                      <SelectValue placeholder="Select accent color" />
                    </SelectTrigger>
                    <SelectContent>
                      {accentOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            <span aria-hidden className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: accentSwatches[value] }} />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="mt-4 space-y-4">
            {!showAccounts && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-amber-900">API key connection required</p>
                      <p className="text-amber-800 text-sm">
                        Accounts are only accessible after connecting your Lunch Money API key.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <Button
                        onClick={() => {
                          beginAccountsLoad()
                          actions.setDemoMode(true)
                        }}
                        variant="outline"
                        className="border-amber-600 text-amber-900 hover:bg-amber-100"
                      >
                        Show Demo Data
                      </Button>
                      <Button
                        onClick={() => setActiveTab("settings")}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Go to Settings
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {showAccounts && (
              <>
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-primary">
                        Accounts overview
                        <Badge
                          variant={preferences.demoMode ? "outline" : "default"}
                          className={preferences.demoMode ? "border-primary/50 text-primary" : ""}
                        >
                          {preferences.demoMode ? "Demo Data" : "Live data"}
                        </Badge>
                        {preferences.demoMode && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (preferences.verificationStatus === "verified") {
                                beginAccountsLoad()
                              } else {
                                prepareLoadMeasurement()
                              }
                              actions.setDemoMode(false)
                            }}
                        className="ml-2 text-primary font-semibold"
                          >
                            Exit Demo
                          </Button>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Use the controls to sort accounts and change currency display mode.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={preferences.accountSort}
                        onValueChange={(value) => actions.setAccountSort(value as AccountSortPreference)}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-fit"
                          aria-label="Sort accounts"
                        >
                          <SelectValue placeholder="Sort accounts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alpha">Alphabetical A-Z</SelectItem>
                          <SelectItem value="balance">Balance High-Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={preferences.currencyMode}
                        onValueChange={(value) => actions.setCurrencyMode(value as CurrencyDisplayMode)}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-fit"
                          aria-label="Currency display mode"
                        >
                          <SelectValue placeholder="Currency display mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary Currency</SelectItem>
                          <SelectItem value="account">Account Currency</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/60 text-foreground hover:bg-accent/40 hover:text-foreground dark:text-foreground"
                        onClick={handleRefresh}
                        disabled={currentAccountsLoading}
                      >
                        {currentAccountsLoading ? "Refreshing..." : (preferences.demoMode ? "Refresh demo data" : "Refresh accounts")}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentAccountsLoading ? (
                      <AccountsContentSkeleton />
                    ) : currentAccountsError ? (
                      <div className="text-center py-8">
                        <p className="text-destructive font-medium">Error loading accounts</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentAccountsError instanceof Error ? currentAccountsError.message : "Unknown error occurred"}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 border-primary/60 text-foreground hover:bg-accent/40 hover:text-foreground dark:text-foreground"
                          onClick={() => currentAccountsRefetch()}
                          disabled={currentAccountsLoading}
                        >
                          {currentAccountsLoading ? "Retrying..." : "Retry"}
                        </Button>
                      </div>
                    ) : currentAccountsData && currentAccountsData.length > 0 ? (
                      currentAccountsData.map((typeGroup) => (
                        <div key={typeGroup.type} className="space-y-3">
                          {/* Asset/Liability Section Header */}
                          <div className="border-b border-border pb-2">
                            <h3 className="text-lg font-semibold">{typeGroup.label}</h3>
                            <p className="text-xs text-muted-foreground">
                              {typeGroup.accountTypeGroups.length} account type(s), {typeGroup.accountTypeGroups.reduce((acc, atg) => acc + atg.accounts.length, 0)} account(s)
                            </p>
                          </div>
                          
                          {/* Account Type Groups */}
                          {typeGroup.accountTypeGroups.map((accountTypeGroup) => (
                            <div key={accountTypeGroup.accountType} className="space-y-2">
                              {/* Account Type Header */}
                              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <span className="text-base">
                                  {accountTypeGroup.accounts.length > 0 ? 
                                    getAccountIcon(accountTypeGroup.accounts[0].account.iconKey) : 
                                    (typeGroup.type === "asset" ? "💰" : "💳")
                                  }
                                </span>
                                {accountTypeGroup.accountType} ({accountTypeGroup.accounts.length})
                              </h4>
                              
                              {/* Accounts in this account type */}
                              <div className="overflow-hidden rounded-md bg-muted/10 divide-y divide-border/60">
                                {accountTypeGroup.accounts.map(({ account }) => {
                                  const amount =
                                    preferences.currencyMode === "primary"
                                      ? account.primaryCurrencyBalance
                                      : account.accountCurrencyBalance
                                  const currency =
                                    preferences.currencyMode === "primary"
                                      ? account.primaryCurrencyCode
                                      : account.accountCurrencyCode
                                  const daysLabel = formatDaysSinceUpdate(account.daysSinceUpdate ?? null)
                                  const isStale =
                                    typeof account.daysSinceUpdate === "number" &&
                                    account.daysSinceUpdate > 7
                                  const showConversionTooltip =
                                    preferences.currencyMode === "account" &&
                                    account.primaryCurrencyBalance !== 0 &&
                                    account.accountCurrencyBalance !== 0 &&
                                    account.primaryCurrencyCode !== account.accountCurrencyCode
                                  const conversionTooltip = showConversionTooltip
                                    ? formatConversionTooltip(
                                        account.primaryCurrencyBalance,
                                        account.primaryCurrencyCode,
                                        account.accountCurrencyBalance,
                                        account.accountCurrencyCode,
                                      )
                                    : null

                                  return (
                                    <div
                                      key={account.id}
                                      className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/30 focus-within:bg-muted/30"
                                    >
                                      <div className="flex flex-1 items-center gap-3 min-w-0">
                                        {account.institutionName ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="font-medium cursor-help truncate outline-none focus-visible:underline" tabIndex={0}>
                                                {account.name}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                              {account.institutionName}
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <span className="font-medium truncate">{account.name}</span>
                                        )}
                                        <div className="whitespace-nowrap text-xs sm:text-sm">
                                          <span className={isStale ? "text-amber-700" : "text-muted-foreground"}>
                                            {daysLabel}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 text-right">
                                        {conversionTooltip && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span
                                                tabIndex={0}
                                                aria-label={conversionTooltip}
                                                className="text-muted-foreground hover:text-foreground cursor-help outline-none focus-visible:text-foreground"
                                              >
                                                <ConversionIcon className="size-3.5" />
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" align="end" className="max-w-xs text-left">
                                              {conversionTooltip}
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                        <span className="font-semibold whitespace-nowrap">
                                          {formatCurrency(amount, currency, account.primaryCurrencyCode)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <NoAccountsEmptyState 
                        onRefresh={handleRefresh}
                        isRefreshing={currentAccountsLoading}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <span>📊</span>
                      Net Worth
                    </CardTitle>
                    <CardDescription>
                      Net worth reflects assets minus liabilities of all accounts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    {currentAccountsLoading || (preferences.demoMode && !demoTotals) ? (
                      <NetWorthContentSkeleton />
                    ) : (
                      <>
                        <div>
                          <p className="text-muted-foreground text-sm">Assets</p>
                          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(finalTotals.assets, preferences.profile?.primaryCurrency ?? "USD", preferences.profile?.primaryCurrency ?? "USD")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Liabilities</p>
                          <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                            {formatCurrency(finalTotals.liabilities, preferences.profile?.primaryCurrency ?? "USD", preferences.profile?.primaryCurrency ?? "USD")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Net</p>
                          <p className={`text-lg font-semibold ${
                            finalTotals.net >= 0 
                              ? 'text-emerald-700 dark:text-emerald-300' 
                              : 'text-red-700 dark:text-red-300'
                          }`}>
                            {formatCurrency(finalTotals.net, preferences.profile?.primaryCurrency ?? "USD", preferences.profile?.primaryCurrency ?? "USD")}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}





