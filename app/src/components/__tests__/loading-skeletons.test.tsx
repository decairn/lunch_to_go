import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { AccountsContentSkeleton, NetWorthContentSkeleton } from "../loading-skeletons"

describe("Loading Skeletons", () => {
  describe("AccountsContentSkeleton", () => {
    it("renders skeleton elements for accounts overview", () => {
      render(<AccountsContentSkeleton />)
      
      // Should render the accounts overview skeleton
      expect(screen.getByTestId("skeleton-accounts-overview")).toBeInTheDocument()
      expect(screen.getByTestId("skeleton-section-1")).toBeInTheDocument()
    })

    it("renders multiple account card skeletons", () => {
      render(<AccountsContentSkeleton />)
      
      // Should render 3 account card skeletons
      expect(screen.getByTestId("skeleton-account-1")).toBeInTheDocument()
      expect(screen.getByTestId("skeleton-account-2")).toBeInTheDocument()
      expect(screen.getByTestId("skeleton-account-3")).toBeInTheDocument()
    })

    it("applies proper styling for skeleton animation", () => {
      const { container } = render(<AccountsContentSkeleton />)
      
      // Should have skeleton base classes for animation
      const skeletonElements = container.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletonElements.length).toBeGreaterThan(0)
    })
  })

  describe("NetWorthContentSkeleton", () => {
    it("renders skeleton elements for net worth display", () => {
      render(<NetWorthContentSkeleton />)
      
      // Should render exactly 3 skeleton sections (Assets, Liabilities, Net)
      expect(screen.getByTestId("skeleton-assets")).toBeInTheDocument()
      expect(screen.getByTestId("skeleton-liabilities")).toBeInTheDocument()
      expect(screen.getByTestId("skeleton-net")).toBeInTheDocument()
    })

    it("renders skeleton elements with proper structure", () => {
      const { container } = render(<NetWorthContentSkeleton />)
      
      // Should have skeleton elements with animate-pulse animation
      const skeletonElements = container.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletonElements.length).toBe(6) // 2 per section (label + amount)
    })
  })
})