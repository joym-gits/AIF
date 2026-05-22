import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabaseMock";

const channelUpdates: unknown[] = [];
const supabaseMock = createSupabaseMock((state) => {
  if (state.table === "subscriptions") return { data: [{ user_id: "user-1" }], error: null };
  if (state.table === "notification_channels" && state.op === "select") {
    return {
      data: [
        {
          id: "channel-1",
          user_id: "user-1",
          feed_id: null,
          channel_type: "webhook",
          enabled: true,
          config: { webhook_url: "https://hooks.example.com/aif" },
        },
      ],
      error: null,
    };
  }
  if (state.table === "notification_channels" && state.op === "update") {
    channelUpdates.push(state.values);
  }
  return { data: null, error: null };
});

vi.mock("../../../backend/src/supabase", () => supabaseMock);

describe("notifySubscribers", () => {
  beforeEach(() => {
    channelUpdates.length = 0;
    vi.clearAllMocks();
  });

  it("sends webhook notifications and marks the channel successful", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const { notifySubscribers } = await import("../../../backend/src/services/notifier");

    await notifySubscribers("feed-1", "Feed", [
      {
        id: "item-1",
        feed_id: "feed-1",
        title: "Title",
        summary: "Summary",
        published_at: "2026-05-22T00:00:00.000Z",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hooks.example.com/aif",
      expect.objectContaining({ method: "POST" }),
    );
    expect(channelUpdates.some((u) => JSON.stringify(u).includes("last_notified_at"))).toBe(true);
  });

  it("does nothing when no items are published", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { notifySubscribers } = await import("../../../backend/src/services/notifier");

    await notifySubscribers("feed-1", "Feed", []);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
