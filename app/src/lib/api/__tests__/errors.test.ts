import { describe, expect, it } from "vitest"
import {
  ApiError,
  AuthenticationError,
  HttpError,
  NetworkError,
  ParseError,
  describeApiError,
} from "@/lib/api/errors"

describe("describeApiError", () => {
  it("returns authentication messaging for auth errors", () => {
    const descriptor = describeApiError(new AuthenticationError("", { status: 401 }))
    expect(descriptor.title).toContain("Authentication")
    expect(descriptor.description).toContain("API key")
  })

  it("returns network messaging for network errors", () => {
    const descriptor = describeApiError(new NetworkError("network"))
    expect(descriptor.title).toContain("Connectivity")
  })

  it("returns parse messaging for parse errors", () => {
    const descriptor = describeApiError(new ParseError("parse"))
    expect(descriptor.title).toContain("Unexpected")
  })

  it("returns http messaging for http errors", () => {
    const descriptor = describeApiError(new HttpError("http", { status: 500 }))
    expect(descriptor.description).toContain("500")
  })

  it("falls back to generic messaging", () => {
    const descriptor = describeApiError(new ApiError("http", "boom"))
    expect(descriptor.title).toBe("Connection failed")
  })
})
