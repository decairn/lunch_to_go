import { describe, expect, it, vi } from "vitest"
import { createApiClient } from "../client"
import { AuthenticationError, NetworkError, ParseError } from "../errors"

describe("createApiClient", () => {
  it("applies base URL, headers, and search params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    const client = createApiClient({
      baseUrl: "https://api.example.com/v1",
      fetchFn: fetchMock,
      getAccessToken: () => "token-123",
    })

    await client.request<{ success: boolean }>({
      path: "/me",
      method: "GET",
      searchParams: { include: "profile" },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.example.com/v1/me?include=profile")
    expect(init?.method).toBe("GET")

    const headers = init?.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer token-123")
    expect(headers.get("Accept")).toBe("application/json")
  })

  it("prefers explicit authToken over configured accessor", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    const client = createApiClient({
      baseUrl: "https://api.example.com/v1",
      fetchFn: fetchMock,
      getAccessToken: () => "ignored-token",
    })

    await client.request({ path: "/secure", authToken: "override-token" })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init?.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer override-token")
  })

  it("throws AuthenticationError when server responds 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    )

    const client = createApiClient({ baseUrl: "https://api.example.com/v1", fetchFn: fetchMock })

    await expect(client.get("/me")).rejects.toBeInstanceOf(AuthenticationError)
  })

  it("wraps invalid JSON responses in ParseError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("oops", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    )

    const client = createApiClient({ baseUrl: "https://api.example.com/v1", fetchFn: fetchMock })

    await expect(client.get("/me")).rejects.toBeInstanceOf(ParseError)
  })

  it("maps network failures to NetworkError", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    const client = createApiClient({ baseUrl: "https://api.example.com/v1", fetchFn: fetchMock })

    await expect(client.get("/me")).rejects.toBeInstanceOf(NetworkError)
  })
})
