export type ApiErrorKind = "authentication" | "network" | "http" | "parse"

interface ApiErrorOptions {
  status?: number
  cause?: unknown
  details?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly details?: unknown

  constructor(kind: ApiErrorKind, message: string, options?: ApiErrorOptions) {
    super(message, { cause: options?.cause })
    this.name = `${kind[0]?.toUpperCase() ?? ""}${kind.slice(1)}Error`
    this.kind = kind
    this.status = options?.status
    this.details = options?.details
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string, options?: ApiErrorOptions) {
    super("authentication", message, options)
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, options?: ApiErrorOptions) {
    super("network", message, options)
  }
}

export class HttpError extends ApiError {
  constructor(message: string, options?: ApiErrorOptions) {
    super("http", message, options)
  }
}

export class ParseError extends ApiError {
  constructor(message: string, options?: ApiErrorOptions) {
    super("parse", message, options)
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof TypeError) {
    return new NetworkError(error.message, { cause: error })
  }

  if (error instanceof Error && typeof (error as { status?: number }).status === "number") {
    const status = (error as unknown as { status: number }).status
    if (status === 401 || status === 403) {
      return new AuthenticationError(error.message, { status, cause: error })
    }

    return new HttpError(error.message, { status, cause: error })
  }

  if (typeof error === "string") {
    return new ApiError("http", error)
  }

  return new ApiError("http", "Unexpected error", { details: error })
}

export function createAuthenticationError(status: number, details?: unknown) {
  return new AuthenticationError("Authentication failed", { status, details })
}

export function createHttpError(status: number, details?: unknown) {
  return new HttpError(`HTTP error ${status}`, { status, details })
}

export function createParseError(message: string, details?: unknown) {
  return new ParseError(message, { details })
}

export interface ApiErrorDescriptor {
  title: string
  description: string
}

export function describeApiError(error: ApiError): ApiErrorDescriptor {
  if (
    error instanceof AuthenticationError ||
    error.status === 401 ||
    error.status === 403
  ) {
    return {
      title: "Authentication failed",
      description: "Authentication error: The API key appears to be invalid. Double-check the value in Lunch Money and try again.",
    }
  }

  if (error instanceof NetworkError) {
    return {
      title: "Connectivity issue",
      description: "We were unable to reach Lunch Money. Check your internet connection and try again shortly.",
    }
  }

  if (error instanceof ParseError) {
    return {
      title: "Unexpected response",
      description: "Lunch Money returned data in an unexpected format. Try again later or contact support if it continues.",
    }
  }

  if (error instanceof HttpError) {
    return {
      title: "Lunch Money returned an error",
      description: `The API responded with status ${error.status ?? "unknown"}. Please retry or review the Lunch Money status page.`,
    }
  }

  return {
    title: "Connection failed",
    description: "Something went wrong while connecting your key. Please try again.",
  }
}
