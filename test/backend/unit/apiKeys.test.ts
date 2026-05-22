import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabaseMock";

const supabaseMock = createSupabaseMock((state) => {
  if (state.table === "api_keys" && state.op === "select") {
    return {
      data: [
        {
          id: "key-1",
          user_id: "user-1",
          feed_id: "feed-1",
          key_hash: testHash,
        },
      ],
      error: null,
    };
  }
  return { data: null, error: null };
});

vi.mock("../../../backend/src/supabase", () => supabaseMock);

let testHash = "";

describe("apiKeys", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    testHash = await bcrypt.hash("aif_sk_valid", 4);
  });

  it("generates API keys with the production prefix", async () => {
    const { API_KEY_PREFIX, generateApiKey } = await import("../../../backend/src/lib/apiKeys");

    expect(generateApiKey()).toMatch(new RegExp(`^${API_KEY_PREFIX}`));
  });

  it("verifies a matching API key and updates last_used_at", async () => {
    const { verifyApiKey } = await import("../../../backend/src/lib/apiKeys");

    const record = await verifyApiKey("aif_sk_valid", "feed-1");

    expect(record?.id).toBe("key-1");
    expect(supabaseMock.supabaseAdmin.from).toHaveBeenCalledWith("api_keys");
  });

  it("rejects keys with the wrong prefix", async () => {
    const { verifyApiKey } = await import("../../../backend/src/lib/apiKeys");

    await expect(verifyApiKey("wrong_valid")).resolves.toBeNull();
  });

  it("returns null when no stored hash matches", async () => {
    const { verifyApiKey } = await import("../../../backend/src/lib/apiKeys");

    await expect(verifyApiKey("aif_sk_wrong")).resolves.toBeNull();
  });
});
