import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabaseMock";

const supabaseMock = createSupabaseMock();

vi.mock("../../../backend/src/supabase", () => supabaseMock);
vi.mock("../../../backend/src/lib/apiKeys", () => ({
  API_KEY_PREFIX: "aif_sk_",
  verifyApiKey: vi.fn(),
}));

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing bearer tokens", async () => {
    const { requireAuth } = await import("../../../backend/src/middleware/auth");
    const res = mockRes();
    const next = vi.fn();

    await requireAuth({ headers: {}, params: {} } as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing bearer token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts valid JWTs from Supabase auth", async () => {
    const { requireAuth } = await import("../../../backend/src/middleware/auth");
    supabaseMock.supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    });
    const req = { headers: { authorization: "Bearer jwt-valid" }, params: {} } as any;
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res as any, next);

    expect(req.user).toEqual({ id: "user-1", email: "test@example.com" });
    expect(req.jwt).toBe("jwt-valid");
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects invalid API keys", async () => {
    const apiKeys = await import("../../../backend/src/lib/apiKeys");
    vi.mocked(apiKeys.verifyApiKey).mockResolvedValue(null);
    const { requireAuth } = await import("../../../backend/src/middleware/auth");
    const res = mockRes();

    await requireAuth(
      { headers: { authorization: "Bearer aif_sk_bad" }, params: { id: "feed-1" } } as any,
      res as any,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid API key" });
  });
});
