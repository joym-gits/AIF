import type { CachedItem } from "./types";

export function buildContextBlock(feedTitle: string, item: CachedItem): string {
  const date = new Date(item.published_at).toISOString().slice(0, 10);
  const signals = (item.signals ?? []).join(", ");
  const confidence = item.confidence != null ? item.confidence.toFixed(2) : "n/a";
  return [
    `[AIF CONTEXT — ${feedTitle} — ${date}]`,
    item.summary,
    `Signals: ${signals}`,
    `Confidence: ${confidence}`,
    `[END AIF CONTEXT]`,
    "",
  ].join("\n");
}
