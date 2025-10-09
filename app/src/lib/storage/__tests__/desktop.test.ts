import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the Tauri API before importing the module
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

import { desktopSecureStorage } from "../desktop"
import { invoke } from "@tauri-apps/api/core"

// Cast to access mock functions
const mockInvoke = invoke as ReturnType<typeof vi.fn>

describe("Desktop Secure Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("readApiKey", () => {
    it("should return API key from Tauri command", async () => {
      const testApiKey = "test-api-key-123"
      mockInvoke.mockResolvedValue(testApiKey)

      const result = await desktopSecureStorage.readApiKey()

      expect(mockInvoke).toHaveBeenCalledWith("read_api_key")
      expect(result).toBe(testApiKey)
    })

    it("should return null when no API key is stored", async () => {
      mockInvoke.mockResolvedValue(null)

      const result = await desktopSecureStorage.readApiKey()

      expect(mockInvoke).toHaveBeenCalledWith("read_api_key")
      expect(result).toBeNull()
    })

    it("should throw error when Tauri command fails", async () => {
      const errorMessage = "Credential not found"
      mockInvoke.mockRejectedValue(new Error(errorMessage))

      await expect(desktopSecureStorage.readApiKey()).rejects.toThrow(errorMessage)
      expect(mockInvoke).toHaveBeenCalledWith("read_api_key")
    })
  })

  describe("writeApiKey", () => {
    it("should store API key via Tauri command", async () => {
      const testApiKey = "test-api-key-456"
      mockInvoke.mockResolvedValue(undefined)

      await desktopSecureStorage.writeApiKey(testApiKey)

      expect(mockInvoke).toHaveBeenCalledWith("store_api_key", { apiKey: testApiKey })
    })

    it("should throw error when Tauri command fails", async () => {
      const errorMessage = "Failed to store credential"
      mockInvoke.mockRejectedValue(new Error(errorMessage))

      await expect(desktopSecureStorage.writeApiKey("test-key")).rejects.toThrow(errorMessage)
    })
  })

  describe("deleteApiKey", () => {
    it("should delete API key via Tauri command", async () => {
      mockInvoke.mockResolvedValue(undefined)

      await desktopSecureStorage.deleteApiKey()

      expect(mockInvoke).toHaveBeenCalledWith("delete_api_key")
    })

    it("should throw error when Tauri command fails", async () => {
      const errorMessage = "Failed to delete credential"
      mockInvoke.mockRejectedValue(new Error(errorMessage))

      await expect(desktopSecureStorage.deleteApiKey()).rejects.toThrow(errorMessage)
    })
  })
})