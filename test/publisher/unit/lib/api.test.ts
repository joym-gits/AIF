import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();

vi.mock("../../../../publisher/src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession,
    },
  },
}));

describe("publisher api helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds auth and content-type headers", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "publisher-token" } } });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../../../../publisher/src/lib/api");

    await api("/api/v1/feeds", { method: "POST", body: "{}" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/feeds",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer publisher-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("throws response status and body on API failure", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: vi.fn().mockResolvedValue("forbidden") }),
    );
    const { api } = await import("../../../../publisher/src/lib/api");

    await expect(api("/api/v1/feeds")).rejects.toThrow("403 forbidden");
  });
});
