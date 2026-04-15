import { z } from "zod";
import type { AIFFeed } from "./types";

const authorSchema = z.object({
  name: z.string().min(1),
  did: z.string().optional(),
  verified: z.boolean(),
});

const itemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string().max(280),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.string()),
  source_urls: z.array(z.string().url()),
  agent_model: z.string().min(1),
  published_at: z.string().datetime({ offset: true }),
  tags: z.array(z.string()),
});

export const aifFeedSchema = z.object({
  aif: z.literal("1.0"),
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string(),
  author: authorSchema,
  domain: z.enum([
    "healthcare",
    "finance",
    "legal",
    "research",
    "tech",
    "general",
  ]),
  cadence: z.enum(["realtime", "daily", "weekly", "monthly"]),
  language: z.string().min(2),
  feed_url: z.string().url(),
  hub_url: z.string().url().optional(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  items: z.array(itemSchema),
});

export type ValidationResult =
  | { ok: true; feed: AIFFeed }
  | { ok: false; errors: z.ZodIssue[] };

export function validateAIFFeed(json: unknown): ValidationResult {
  const result = aifFeedSchema.safeParse(json);
  if (result.success) {
    return { ok: true, feed: result.data as AIFFeed };
  }
  return { ok: false, errors: result.error.issues };
}
