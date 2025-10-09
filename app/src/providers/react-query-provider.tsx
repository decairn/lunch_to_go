"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"

const defaultRetryDelay = (attemptIndex: number) => {
  const baseDelay = 500
  const cappedAttempt = Math.min(attemptIndex, 2)
  return baseDelay * 2 ** cappedAttempt
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (failureCount >= 3) {
                return false
              }

              if (error instanceof Error && "status" in error) {
                const status = Number((error as { status?: number }).status ?? 0)
                if (status === 401 || status === 403) {
                  return false
                }
              }

              return true
            },
            retryDelay: defaultRetryDelay,
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
