import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
  disabled?: boolean
}

export function EmptyState({ title, description, actionLabel, onAction, icon, disabled = false }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && (
          <div className="mb-4 text-4xl text-muted-foreground">
            {icon}
          </div>
        )}
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="outline" disabled={disabled}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function NoAccountsEmptyState({ onRefresh, isRefreshing = false }: { onRefresh: () => void; isRefreshing?: boolean }) {
  return (
    <EmptyState
      icon="🏦"
      title="No accounts found"
      description="We couldn't find any accounts in your Lunch Money data. Try refreshing to reload your account information."
      actionLabel={isRefreshing ? "Refreshing..." : "Refresh accounts"}
      onAction={onRefresh}
      disabled={isRefreshing}
    />
  )
}