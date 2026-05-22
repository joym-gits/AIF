import { describe, expect, it } from "vitest";
import { buildContextBlock } from "../../../extension/src/contentUtils";
import { DEFAULT_BACKEND } from "../../../extension/src/types";

describe("extension content utilities", () => {
  it("builds stable context blocks for AI chat injection", () => {
    expect(
      buildContextBlock("Research Feed", {
        id: "item-1",
        title: "Title",
        summary: "A concise finding.",
        confidence: 0.876,
        signals: ["AI", "Benchmarks"],
        published_at: "2026-05-22T08:00:00.000Z",
      }),
    ).toBe(
      [
        "[AIF CONTEXT — Research Feed — 2026-05-22]",
        "A concise finding.",
        "Signals: AI, Benchmarks",
        "Confidence: 0.88",
        "[END AIF CONTEXT]",
        "",
      ].join("\n"),
    );
  });

  it("keeps a production backend default for extension settings", () => {
    expect(DEFAULT_BACKEND).toMatch(/^https:\/\//);
  });
});
