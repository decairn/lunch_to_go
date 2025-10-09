import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { EmptyState, NoAccountsEmptyState } from "../empty-states"

describe("Empty States", () => {
  describe("EmptyState", () => {
    it("renders title and description", () => {
      render(
        <EmptyState
          title="No data found"
          description="There is nothing to display"
        />
      )
      
      expect(screen.getByText("No data found")).toBeInTheDocument()
      expect(screen.getByText("There is nothing to display")).toBeInTheDocument()
    })

    it("renders action button when provided", () => {
      const mockAction = vi.fn()
      render(
        <EmptyState
          title="No data found"
          description="There is nothing to display"
          actionLabel="Retry"
          onAction={mockAction}
        />
      )
      
      const button = screen.getByRole("button", { name: "Retry" })
      expect(button).toBeInTheDocument()
      
      fireEvent.click(button)
      expect(mockAction).toHaveBeenCalledOnce()
    })

    it("disables action button when disabled prop is true", () => {
      const mockAction = vi.fn()
      render(
        <EmptyState
          title="No data found"
          description="There is nothing to display"
          actionLabel="Retry"
          onAction={mockAction}
          disabled={true}
        />
      )
      
      const button = screen.getByRole("button", { name: "Retry" })
      expect(button).toBeDisabled()
    })

    it("renders icon when provided", () => {
      render(
        <EmptyState
          title="No data found"
          description="There is nothing to display"
          icon="🔍"
        />
      )
      
      expect(screen.getByText("🔍")).toBeInTheDocument()
    })
  })

  describe("NoAccountsEmptyState", () => {
    it("renders accounts-specific empty state", () => {
      const mockRefresh = vi.fn()
      render(<NoAccountsEmptyState onRefresh={mockRefresh} />)
      
      expect(screen.getByText("No accounts found")).toBeInTheDocument()
      expect(screen.getByText(/We couldn't find any accounts/)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Refresh accounts" })).toBeInTheDocument()
    })

    it("shows refreshing state when isRefreshing is true", () => {
      const mockRefresh = vi.fn()
      render(<NoAccountsEmptyState onRefresh={mockRefresh} isRefreshing={true} />)
      
      const button = screen.getByRole("button", { name: "Refreshing..." })
      expect(button).toBeDisabled()
    })

    it("calls onRefresh when button is clicked", () => {
      const mockRefresh = vi.fn()
      render(<NoAccountsEmptyState onRefresh={mockRefresh} />)
      
      const button = screen.getByRole("button", { name: "Refresh accounts" })
      fireEvent.click(button)
      
      expect(mockRefresh).toHaveBeenCalledOnce()
    })
  })
})