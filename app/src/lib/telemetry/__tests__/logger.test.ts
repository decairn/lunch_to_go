import { describe, expect, it } from "vitest"
import { NetworkError } from "@/lib/api/errors"
import { logTelemetryEvent, logApiErrorEvent } from "../logger"

describe("logTelemetryEvent", () => {
  it("redacts sensitive keys and returns payload metadata", () => {
    const payload = logTelemetryEvent({
      category: "app",
      action: "test-event",
      context: {
        apiKey: "super-secret",
        note: "hello",
        nested: {
          token: "abc123",
        },
      },
    })

    expect(payload.category).toBe("app")
    expect(payload.action).toBe("test-event")
    expect(payload.timestamp).toBeTypeOf("string")
    expect(payload.context?.apiKey).toBe("[REDACTED]")
    expect(payload.context?.nested).toMatchObject({ token: "[REDACTED]" })
    expect(payload.context?.note).toBe("hello")
  })
})

describe("logApiErrorEvent", () => {
  it("logs structured payload for ApiError instances", () => {
    const error = new NetworkError("Failed to reach API")

    const payload = logApiErrorEvent(error, {
      action: "accounts.fetch",
      requestUrl: "https://api.lunchmoney.app/v1/assets",
      retryCount: 1,
    })

    expect(payload.category).toBe("api")
    expect(payload.action).toBe("accounts.fetch")
    expect(payload.errorCode).toBe("network")
    expect(payload.level).toBe("error")
    expect(payload.context).toMatchObject({
      requestUrl: "https://api.lunchmoney.app/v1/assets",
      retryCount: 1,
      status: undefined,
    })
  })
})
