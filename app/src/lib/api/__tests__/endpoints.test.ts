import { describe, expect, it } from "vitest"
import type { ApiClient } from "@/lib/api"
import { fetchMe } from "@/lib/api"

const baseResponse = {
  user_name: "Jamie Demo",
  user_email: "jamie@example.com",
  user_id: 123,
  account_id: 456,
  budget_name: "Demo Budget",
  primary_currency: "usd",
  api_key_label: "CLI Key",
}

describe("fetchMe", () => {
  it("normalizes direct responses", async () => {
    const client: Pick<ApiClient, "get"> = {
      get: async () => baseResponse,
    }

    const profile = await fetchMe(client as ApiClient)

    expect(profile).toEqual({
      name: "Jamie Demo",
      email: "jamie@example.com",
      userId: 123,
      accountId: 456,
      budgetName: "Demo Budget",
      primaryCurrency: "USD",
      apiKeyLabel: "CLI Key",
    })
  })

  it("supports wrapped responses", async () => {
    const client: Pick<ApiClient, "get"> = {
      get: async () => ({ data: baseResponse }),
    }

    const profile = await fetchMe(client as ApiClient)

    expect(profile.name).toBe("Jamie Demo")
  })

  it("throws when the response is invalid", async () => {
    const client: Pick<ApiClient, "get"> = {
      get: async () => ({ user_name: null }),
    }

    await expect(fetchMe(client as ApiClient)).rejects.toThrowError(/Invalid \/v1\/me response/)
  })
})
