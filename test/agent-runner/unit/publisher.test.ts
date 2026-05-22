import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishItem } from "../../../agent-runner/src/publisher";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("publishItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AIF_BACKEND_URL;
  });

  it("posts a normalized item payload to the default backend", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });

    await publishItem(
      "feed-1",
      "aif_sk_test",
      {
        title: "Title",
        summary: "x".repeat(300),
        content: "Content",
        confidence: 0.88,
        signals: ["signal"],
        tags: ["tag"],
      },
      "claude-test",
      ["https://example.com/source"],
    );

    expect(axios.post).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/feeds/feed-1/items",
      expect.objectContaining({
        title: "Title",
        summary: "x".repeat(280),
        source_urls: ["https://example.com/source"],
        agent_model: "claude-test",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer aif_sk_test" }),
        timeout: 15_000,
      }),
    );
  });

  it("uses AIF_BACKEND_URL when configured", async () => {
    process.env.AIF_BACKEND_URL = "https://api.example.com";
    vi.mocked(axios.post).mockResolvedValue({ data: {} });

    await publishItem(
      "feed-1",
      "aif_sk_test",
      { title: "Title", summary: "Summary", content: "Content", confidence: 0.5 },
      "model",
      [],
    );

    expect(axios.post).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/feeds/feed-1/items",
      expect.any(Object),
      expect.any(Object),
    );
  });
});
