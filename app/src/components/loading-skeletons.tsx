import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AccountListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Assets Section */}
      <div>
        <div className="mb-4">
          <Skeleton className="h-6 w-16 mb-2" /> {/* "Assets" title */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Account type groups */}
        <div className="space-y-4">
          {[1, 2, 3].map((group) => (
            <div key={group}>
              <Skeleton className="h-5 w-48 mb-3" /> {/* Account type header */}
              <div className="space-y-2">
                {[1, 2, 3].map((account) => (
                  <div key={account} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" /> {/* Account name */}
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16" /> {/* Institution */}
                        <Skeleton className="h-3 w-8" />  {/* Dash */}
                        <Skeleton className="h-3 w-12" /> {/* Type */}
                      </div>
                      <Skeleton className="h-3 w-24" /> {/* Days since update */}
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-3 w-3 ml-auto" /> {/* Conversion icon */}
                      <Skeleton className="h-5 w-20" /> {/* Balance */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liabilities Section */}
      <div>
        <div className="mb-4">
          <Skeleton className="h-6 w-20 mb-2" /> {/* "Liabilities" title */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2].map((group) => (
            <div key={group}>
              <Skeleton className="h-5 w-40 mb-3" /> {/* Account type header */}
              <div className="space-y-2">
                {[1, 2].map((account) => (
                  <div key={account} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36" /> {/* Account name */}
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-20" /> {/* Institution */}
                        <Skeleton className="h-3 w-8" />  {/* Dash */}
                        <Skeleton className="h-3 w-16" /> {/* Type */}
                      </div>
                      <Skeleton className="h-3 w-24" /> {/* Days since update */}
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-3 w-3 ml-auto" /> {/* Conversion icon */}
                      <Skeleton className="h-5 w-24" /> {/* Balance */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function NetWorthSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" /> {/* Icon */}
          <Skeleton className="h-6 w-24" /> {/* "Net Worth" title */}
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-64" /> {/* Description text */}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div data-testid="skeleton-assets">
          <Skeleton className="h-4 w-12 mb-1" /> {/* "Assets" label */}
          <Skeleton className="h-6 w-20" /> {/* Assets amount */}
        </div>
        <div data-testid="skeleton-liabilities">
          <Skeleton className="h-4 w-16 mb-1" /> {/* "Liabilities" label */}
          <Skeleton className="h-6 w-20" /> {/* Liabilities amount */}
        </div>
        <div data-testid="skeleton-net">
          <Skeleton className="h-4 w-8 mb-1" /> {/* "Net" label */}
          <Skeleton className="h-6 w-24" /> {/* Net worth amount */}
        </div>
      </CardContent>
    </Card>
  )
}

export function NetWorthContentSkeleton() {
  return (
    <>
      <div data-testid="skeleton-assets">
        <Skeleton className="h-4 w-12 mb-1" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div data-testid="skeleton-liabilities">
        <Skeleton className="h-4 w-16 mb-1" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div data-testid="skeleton-net">
        <Skeleton className="h-4 w-8 mb-1" />
        <Skeleton className="h-6 w-24" />
      </div>
    </>
  )
}

export function AccountsOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-36" /> {/* "Accounts overview" title */}
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-48" /> {/* Description */}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-10 w-32" /> {/* Sort select */}
            <Skeleton className="h-10 w-32" /> {/* Currency select */}
          </div>
          <Skeleton className="h-10 w-32" /> {/* Refresh button */}
        </div>

        {/* Account list skeleton */}
        <AccountListSkeleton />
      </CardContent>
    </Card>
  )
}

export function AccountsContentSkeleton() {
  return (
    <div className="space-y-6" data-testid="skeleton-accounts-overview">
      {/* Asset/Liability Section Skeleton */}
      <div className="space-y-4" data-testid="skeleton-section-1">
        <div className="border-b border-border pb-2">
          <Skeleton className="h-7 w-24 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        {/* Account Type Group Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          
          {/* Account Cards Skeleton */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`skeleton-account-${i}`}
              >
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-6 w-24 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}