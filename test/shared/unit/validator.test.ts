import { describe, expect, it } from "vitest";
import { validateAIFFeed } from "../../../shared/src/validator";
import type { AIFFeed } from "../../../shared/src/types";

const validFeed: AIFFeed = {
  aif: "1.0",
  id: "11111111-1111-4111-8111-111111111111",
  title: "Daily Research Signals",
  description: "AI-generated research intelligence.",
  author: {
    name: "AIF Labs",
    verified: true,
  },
  domain: "research",
  cadence: "daily",
  language: "en",
  feed_url: "https://example.com/aif.json",
  created_at: "2026-05-22T00:00:00.000Z",
  updated_at: "2026-05-22T01:00:00.000Z",
  items: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      title: "New benchmark released",
      summary: "A short sourced summary.",
      content: "Longer markdown content.",
      confidence: 0.91,
      signals: ["benchmark"],
      source_urls: ["https://example.com/source"],
      agent_model: "claude-test",
      published_at: "2026-05-22T01:00:00.000Z",
      tags: ["ai"],
    },
  ],
};

describe("validateAIFFeed", () => {
  it("accepts a complete valid AIF feed", () => {
    const result = validateAIFFeed(validFeed);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.feed.title).toBe("Daily Research Signals");
      expect(result.feed.items).toHaveLength(1);
    }
  });

  it.each([
    ["bad feed uuid", { id: "not-a-uuid" }, ["id"]],
    ["bad feed url", { feed_url: "not-a-url" }, ["feed_url"]],
    ["invalid domain", { domain: "sports" }, ["domain"]],
    ["invalid cadence", { cadence: "hourly" }, ["cadence"]],
    ["missing title", { title: "" }, ["title"]],
  ])("rejects %s", (_name, patch, expectedPath) => {
    const result = validateAIFFeed({ ...validFeed, ...patch });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path.join(".") === expectedPath.join("."))).toBe(true);
    }
  });

  it("rejects item fields outside the protocol contract", () => {
    const result = validateAIFFeed({
      ...validFeed,
      items: [
        {
          ...validFeed.items[0],
          confidence: 1.2,
          summary: "x".repeat(281),
          source_urls: ["not-a-url"],
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((issue) => issue.path.join("."));
      expect(paths).toContain("items.0.confidence");
      expect(paths).toContain("items.0.summary");
      expect(paths).toContain("items.0.source_urls.0");
    }
  });
});
