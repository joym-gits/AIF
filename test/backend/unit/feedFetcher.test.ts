import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabaseMock";

const writes: Array<{ table: string; op: string; values: unknown }> = [];
const supabaseMock = createSupabaseMock((state) => {
  if (state.op === "update" || state.op === "upsert") {
    writes.push({ table: state.table, op: state.op, values: state.values });
  }
  if (state.table === "subscriptions") return { data: [], count: 0, error: null };
  if (state.table === "feeds" && state.op === "select") return { data: { user_id: "user-1" }, error: null };
  return { data: [], error: null, count: 0 };
});

vi.mock("../../../backend/src/supabase", () => supabaseMock);
vi.mock("../../../backend/src/services/verification", () => ({ maybeMarkVerified: vi.fn() }));

const validFeed = {
  aif: "1.0",
  id: "11111111-1111-4111-8111-111111111111",
  title: "Fetched Feed",
  description: "Fetched description",
  author: { name: "Agent", verified: true },
  domain: "tech",
  cadence: "daily",
  language: "en",
  feed_url: "https://example.com/aif.json",
  created_at: "2026-05-22T00:00:00.000Z",
  updated_at: "2026-05-22T01:00:00.000Z",
  items: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Item",
      summary: "Summary",
      content: "Content",
      confidence: 0.8,
      signals: ["signal"],
      source_urls: ["https://example.com/source"],
      agent_model: "model",
      published_at: "2026-05-22T01:00:00.000Z",
      tags: ["tag"],
    },
  ],
};

describe("fetchAndStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writes.length = 0;
  });

  it("fetches, validates, stores feed metadata, and upserts items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(validFeed) }),
    );
    const { fetchAndStore } = await import("../../../backend/src/services/feedFetcher");

    const feed = await fetchAndStore("feed-1", "https://example.com/aif.json");

    expect(feed.title).toBe("Fetched Feed");
    expect(writes.some((w) => w.table === "feeds" && w.op === "update")).toBe(true);
    expect(writes.some((w) => w.table === "feed_items" && w.op === "upsert")).toBe(true);
  });

  it("records last_error when fetching fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { fetchAndStore } = await import("../../../backend/src/services/feedFetcher");

    await expect(fetchAndStore("feed-1", "https://example.com/aif.json")).rejects.toThrow("Fetch failed: 500");
    expect(writes.some((w) => w.table === "feeds" && JSON.stringify(w.values).includes("Fetch failed: 500"))).toBe(true);
  });
});
