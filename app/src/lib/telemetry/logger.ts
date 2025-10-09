import type { ApiError } from "@/lib/api/errors"

type TelemetryLevel = "info" | "warn" | "error"

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization)/i
const MAX_STRING_LENGTH = 200
const MAX_ARRAY_LENGTH = 10
const MAX_DEPTH = 3

export interface TelemetryEvent {
  category: string
  action: string
  level?: TelemetryLevel
  errorCode?: string
  message?: string
  context?: Record<string, unknown>
}

export interface TelemetryPayload extends TelemetryEvent {
  level: TelemetryLevel
  timestamp: string
  context?: Record<string, unknown>
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return "[Truncated]"
  }

  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === "string") {
    if (SENSITIVE_KEY_PATTERN.test(value)) {
      return "[REDACTED]"
    }
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => redactValue(item, depth + 1))
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = "[REDACTED]"
        continue
      }
      result[key] = redactValue(entry, depth + 1)
    }
    return result
  }

  return String(value)
}

function sanitizeContext(context?: Record<string, unknown>) {
  if (!context) return undefined
  return Object.entries(context).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = redactValue(value)
    return acc
  }, {})
}

function resolveConsole(level: TelemetryLevel) {
  if (level === "error") {
    return console.error.bind(console)
  }
  if (level === "warn") {
    return console.warn.bind(console)
  }
  return console.info.bind(console)
}

export function logTelemetryEvent(event: TelemetryEvent): TelemetryPayload {
  const payload: TelemetryPayload = {
    ...event,
    level: event.level ?? "info",
    timestamp: new Date().toISOString(),
    context: sanitizeContext(event.context),
  }

  if (process.env.NODE_ENV !== "test") {
    const logger = resolveConsole(payload.level)
    logger("[telemetry]", payload)
  }

  return payload
}

export interface ApiErrorTelemetryOptions {
  action: string
  requestUrl?: string
  requestMethod?: string
  retryCount?: number
  context?: Record<string, unknown>
}

export function logApiErrorEvent(error: ApiError, options: ApiErrorTelemetryOptions) {
  const { action, requestUrl, requestMethod, retryCount, context } = options

  return logTelemetryEvent({
    category: "api",
    action,
    level: "error",
    errorCode: error.kind,
    message: error.message,
    context: {
      status: error.status,
      requestUrl,
      requestMethod,
      retryCount,
      details: error.details,
      ...context,
    },
  })
}

export function logWarningEvent(action: string, context?: Record<string, unknown>) {
  return logTelemetryEvent({
    category: "app",
    action,
    level: "warn",
    context,
  })
}

