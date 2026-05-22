import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("../../../../reader/src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession,
    },
  },
}));

describe("reader api helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds an authorization header when a session exists", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "token-1" } } });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../../../../reader/src/lib/api");

    await api("/api/v1/feeds");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/feeds",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      }),
    );
  });

  it("omits authorization without a session and throws on non-2xx responses", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: vi.fn().mockResolvedValue("boom") }),
    );
    const { api } = await import("../../../../reader/src/lib/api");

    await expect(api("/api/v1/feeds")).rejects.toThrow("500 boom");
  });
});
