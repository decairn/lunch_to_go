/**
 * Platform-aware API configuration
 * 
 * For web builds: Use Next.js API proxy at /api/lunchmoney
 * For desktop builds: Connect directly to api.lunchmoney.app
 */

import { LUNCHMONEY_API_BASE_URL } from "./constants"

/**
 * Determines if we're running in a Tauri desktop environment
 */
export function isDesktopApp(): boolean {
  if (typeof window === "undefined") {
    return false
  }
  
  // Tauri injects __TAURI__ global variable
  return "__TAURI__" in window
}

/**
 * Gets the appropriate API base URL for the current platform
 * 
 * @returns Base URL for API calls - direct API for both platforms
 */
export function getApiBaseUrl(): string {
  // Use direct API for both web and desktop for now
  // TODO: Implement proxy route for web if needed for CORS
  return LUNCHMONEY_API_BASE_URL
}
