import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "./config";
import { gatherSources } from "./sources";

export interface GeneratedItem {
  title: string;
  summary: string;
  content: string;
  confidence: number;
  signals: string[];
  tags: string[];
}

export async function runAgent(cfg: AgentConfig): Promise<GeneratedItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const contents = await gatherSources(cfg.agent.sources);
  if (contents.length === 0) {
    console.warn("[agent] no source content gathered");
    return [];
  }

  const sourceBlock = contents
    .map((c) => `<source url="${c.label}">\n${c.text}\n</source>`)
    .join("\n\n");

  const date = new Date().toISOString().slice(0, 10);
  const system = [
    `You are ${cfg.agent.persona}`,
    `Today is ${date}.`,
    "You are publishing to an AIF (AI Intelligence Feed) — a structured intelligence stream.",
    "",
    `Analyse the provided source content and generate ${cfg.agent.output.max_items} AIF feed items.`,
    "",
    "Respond ONLY with a JSON array of items matching this schema:",
    `[
  {
    "title": "concise title",
    "summary": "max 280 chars plain text",
    "content": "full markdown analysis, minimum 200 words",
    "confidence": 0.0-1.0 (your confidence in this analysis),
    "signals": ["key entities, drugs, companies, concepts mentioned"],
    "tags": ["topic tags"]
  }
]`,
    "",
    "Confidence scoring: 0.9+ = verified facts with strong signal, 0.7-0.9 = well-supported analysis, 0.5-0.7 = emerging pattern with uncertainty, below 0.5 = speculative.",
    "",
    cfg.agent.instructions,
  ].join("\n");

  const res = await client.messages.create({
    model: cfg.agent.model,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: sourceBlock }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const items = parseItems(text);
  return items.slice(0, cfg.agent.output.max_items);
}

function parseItems(text: string): GeneratedItem[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < 0) {
    throw new Error(`No JSON array found in model output:\n${text}`);
  }
  const json = text.slice(start, end + 1);
  const parsed = JSON.parse(json) as GeneratedItem[];
  if (!Array.isArray(parsed)) throw new Error("Model output was not a JSON array");
  return parsed;
}
