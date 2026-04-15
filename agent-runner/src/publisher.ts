import axios from "axios";
import { randomUUID } from "node:crypto";
import type { GeneratedItem } from "./agent";

export interface PublishedItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  confidence: number;
  signals: string[];
  source_urls: string[];
  agent_model: string;
  tags: string[];
  published_at: string;
}

export async function publishItem(
  feedId: string,
  apiKey: string,
  item: GeneratedItem,
  model: string,
  sourceUrls: string[],
): Promise<void> {
  const base = process.env.AIF_BACKEND_URL ?? "http://localhost:3001";
  const payload: PublishedItem = {
    id: randomUUID(),
    title: item.title,
    summary: item.summary.slice(0, 280),
    content: item.content,
    confidence: item.confidence,
    signals: item.signals ?? [],
    source_urls: sourceUrls,
    agent_model: model,
    tags: item.tags ?? [],
    published_at: new Date().toISOString(),
  };
  await axios.post(`${base}/api/v1/feeds/${feedId}/items`, payload, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    timeout: 15_000,
  });
}
