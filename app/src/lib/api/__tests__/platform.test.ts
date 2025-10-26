import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { isDesktopApp, getApiBaseUrl } from "../platform"
import { LUNCHMONEY_API_BASE_URL } from "../constants"

describe("Platform Detection", () => {
  beforeEach(() => {
    // Clear any existing window mock
    delete (global as unknown as { window: unknown }).window
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("isDesktopApp", () => {
    it("should return false when window is undefined", () => {
      expect(isDesktopApp()).toBe(false)
    })

    it("should return false when __TAURI__ is not present", () => {
      ;(global as unknown as { window: unknown }).window = {}
      expect(isDesktopApp()).toBe(false)
    })

    it("should return true when __TAURI__ is present", () => {
      ;(global as unknown as { window: { __TAURI__: unknown } }).window = {
        __TAURI__: {},
      }
      expect(isDesktopApp()).toBe(true)
    })
  })

  describe("getApiBaseUrl", () => {
    it("should return direct API URL for both web and desktop (simplified approach)", () => {
      // Web environment (no __TAURI__)
      ;(global as unknown as { window: unknown }).window = {}
      expect(getApiBaseUrl()).toBe(LUNCHMONEY_API_BASE_URL)
      
      // Desktop environment (with __TAURI__)
      ;(global as unknown as { window: { __TAURI__: unknown } }).window = {
        __TAURI__: {},
      }
      expect(getApiBaseUrl()).toBe(LUNCHMONEY_API_BASE_URL)
      
      // No window (SSR environment)
      delete (global as unknown as { window: unknown }).window
      expect(getApiBaseUrl()).toBe(LUNCHMONEY_API_BASE_URL)
    })
  })
})
