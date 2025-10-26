import { logApiErrorEvent } from "@/lib/telemetry"
import { createAuthenticationError, createHttpError, createParseError, toApiError } from "./errors"
import { LUNCHMONEY_API_BASE_URL } from "./constants"

type FetchLike = typeof fetch

export interface ApiClientConfig {
  baseUrl?: string
  getAccessToken?: () => string | null | Promise<string | null>
  fetchFn?: FetchLike
}

export interface RequestConfig {
  path: string
  method?: string
  searchParams?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  authToken?: string | null
}

export interface ApiClient {
  request<TResponse>(config: RequestConfig): Promise<TResponse>
  get<TResponse>(path: string, config?: Omit<RequestConfig, "path" | "method">): Promise<TResponse>
}

function buildUrl(baseUrl: string, path: string, searchParams?: RequestConfig["searchParams"]): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith("http")
    ? path
    : `${normalizedBase}/${path.startsWith("/") ? path.slice(1) : path}`

  // Handle relative URLs by using the current origin if available
  const url = normalizedPath.startsWith("http")
    ? new URL(normalizedPath)
    : new URL(normalizedPath, typeof window !== "undefined" ? window.location.origin : "http://localhost")

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null) {
        continue
      }
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")

  try {
    if (isJson) {
      return await response.clone().json()
    }

    const text = await response.clone().text()
    return text || undefined
  } catch (error) {
    return { parseError: (error as Error)?.message }
  }
}

async function handleHttpError(response: Response): Promise<never> {
  const details = await parseErrorBody(response)
  const status = response.status

  if (status === 401 || status === 403) {
    throw createAuthenticationError(status, details)
  }

  throw createHttpError(status, details)
}

async function serializeBody(body: unknown): Promise<BodyInit | undefined> {
  if (body === undefined || body === null) {
    return undefined
  }

  if (typeof body === "string" || body instanceof Blob || body instanceof FormData) {
    return body
  }

  if (body instanceof URLSearchParams) {
    return body
  }

  return JSON.stringify(body)
}

export function createApiClient(config: ApiClientConfig = {}): ApiClient {
  const baseUrl = config.baseUrl ?? LUNCHMONEY_API_BASE_URL
  const fetchImpl = config.fetchFn ?? fetch
  const getAccessToken = config.getAccessToken

  return {
    async request<TResponse>(requestConfig: RequestConfig): Promise<TResponse> {
      const method = requestConfig.method ?? "GET"
      const url = buildUrl(baseUrl, requestConfig.path, requestConfig.searchParams)
      const headers = new Headers(requestConfig.headers)
      headers.set("Accept", "application/json")

      const resolvedToken =
        requestConfig.authToken !== undefined
          ? requestConfig.authToken
          : (await getAccessToken?.()) ?? null

      if (resolvedToken) {
        headers.set("Authorization", `Bearer ${resolvedToken}`)
      }

      let body: BodyInit | undefined
      try {
        body = await serializeBody(requestConfig.body)
      } catch (error) {
        throw createParseError("Failed to serialize request body", error)
      }

      if (body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json")
      }

      const fetchInit: RequestInit = {
        method,
        headers,
        body,
        signal: requestConfig.signal,
      }

      try {
        const response = await fetchImpl(url, fetchInit)

        if (!response.ok) {
          await handleHttpError(response)
        }

        if (response.status === 204) {
          return undefined as TResponse
        }

        const contentType = response.headers.get("content-type") ?? ""
        if (!contentType.includes("application/json")) {
          throw createParseError("Unexpected response content type", {
            contentType,
            url,
            status: response.status,
          })
        }

        try {
          // First get the response text, then parse it
          const responseText = await response.text()
          return JSON.parse(responseText) as TResponse
        } catch (error) {
          // If we're here, either response.text() failed or JSON.parse() failed
          // For debugging, try to get some info about what went wrong
          const parseDetails = {
            error,
            url,
            status: response.status,
            contentType,
          }

          throw createParseError("Failed to parse response body", parseDetails)
        }
      } catch (error) {
        const apiError = toApiError(error)
        const action =
          apiError.kind === "authentication"
            ? "request.auth"
            : apiError.kind === "network"
              ? "request.network"
              : apiError.kind === "parse"
                ? "response.parse"
                : "request.http"

        logApiErrorEvent(apiError, {
          action,
          requestUrl: url,
          requestMethod: method,
        })

        throw apiError
      }
    },

    get<TResponse>(path: string, config?: Omit<RequestConfig, "path" | "method">) {
      return this.request<TResponse>({ ...config, path, method: "GET" })
    },
  }
}
