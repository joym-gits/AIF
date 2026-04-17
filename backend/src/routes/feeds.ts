import { Router, Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "../supabase";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { fetchAndStore } from "../services/feedFetcher";
import { logger } from "../lib/logger";
import { maybeMarkVerified } from "../services/verification";
import { env } from "../env";
import { notifySubscribers } from "../services/notifier";

const MAX_ITEMS_PER_FEED = 1000;
const MAX_ITEMS_PER_PUBLISH = 10;

const router = Router();

router.get("/", async (req, res) => {
  const domain = typeof req.query.domain === "string" ? req.query.domain : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const sort = req.query.sort === "new" ? "new" : "popular";

  let q = supabaseAdmin.from("feeds").select("*").eq("is_public", true);
  if (domain) q = q.eq("domain", domain);
  if (search) q = q.ilike("title", `%${search}%`);
  q =
    sort === "new"
      ? q.order("created_at", { ascending: false })
      : q.order("subscriber_count", { ascending: false });

  const { data, error } = await q.limit(50);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ feeds: data });
});

router.get("/:id", async (req, res) => {
  const { data: feed, error } = await supabaseAdmin
    .from("feeds")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error || !feed) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { data: items } = await supabaseAdmin
    .from("feed_items")
    .select("*")
    .eq("feed_id", feed.id)
    .order("published_at", { ascending: false })
    .limit(10);
  res.json({ feed, items: items ?? [] });
});

router.post("/hosted", requireAuth, async (req: AuthedRequest, res: Response) => {
  const parsed = z
    .object({
      title: z.string().min(1).max(120),
      description: z.string().max(500).optional().default(""),
      domain: z.enum(["healthcare", "finance", "legal", "research", "tech", "general"]),
      cadence: z.enum(["realtime", "daily", "weekly", "monthly"]),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }
  const tempId = crypto.randomUUID();
  const feed_url = `${env.PUBLIC_BASE_URL}/feeds/${tempId}/aif.json`;
  const { data, error } = await supabaseAdmin
    .from("feeds")
    .insert({
      id: tempId,
      user_id: req.user!.id,
      title: parsed.data.title,
      description: parsed.data.description,
      domain: parsed.data.domain,
      cadence: parsed.data.cadence,
      feed_url,
    })
    .select()
    .single();
  if (error || !data) {
    res.status(400).json({ error: error?.message ?? "insert failed" });
    return;
  }
  logger.info({ feedId: data.id, userId: req.user!.id }, "hosted feed created");
  res.status(201).json({ id: data.id, feed: data });
});

router.post("/", requireAuth, async (req: AuthedRequest, res: Response) => {
  const parsed = z.object({ feed_url: z.string().url() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("feeds")
    .insert({
      user_id: req.user!.id,
      title: "pending",
      feed_url: parsed.data.feed_url,
    })
    .select()
    .single();
  if (insertErr || !inserted) {
    res.status(400).json({ error: insertErr?.message ?? "insert failed" });
    return;
  }

  try {
    const feed = await fetchAndStore(inserted.id, parsed.data.feed_url);
    res.status(201).json({ id: inserted.id, feed });
  } catch (err) {
    await supabaseAdmin.from("feeds").delete().eq("id", inserted.id);
    res.status(400).json({ error: (err as Error).message });
  }
});

router.delete("/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { data: feed } = await supabaseAdmin
    .from("feeds")
    .select("user_id")
    .eq("id", req.params.id)
    .single();
  if (!feed) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (feed.user_id !== req.user!.id) {
    res.status(403).json({ error: "not owner" });
    return;
  }
  const { error } = await supabaseAdmin.from("feeds").delete().eq("id", req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(204).end();
});

router.get("/:id/items", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size ?? 25)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from("feed_items")
    .select("*", { count: "exact" })
    .eq("feed_id", req.params.id)
    .order("published_at", { ascending: false })
    .range(from, to);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data, page, page_size: pageSize, total: count ?? 0 });
});

router.post("/:id/subscribe", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .insert({ user_id: req.user!.id, feed_id: req.params.id });
  if (error && !error.message.includes("duplicate")) {
    res.status(400).json({ error: error.message });
    return;
  }
  await bumpSubscriberCount(req.params.id);
  res.status(201).json({ ok: true });
});

router.delete("/:id/subscribe", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .delete()
    .eq("user_id", req.user!.id)
    .eq("feed_id", req.params.id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  await bumpSubscriberCount(req.params.id);
  res.status(204).end();
});

const itemInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  summary: z.string().max(280),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.string()).default([]),
  source_urls: z.array(z.string().url()).default([]),
  agent_model: z.string().default("manual"),
  tags: z.array(z.string()).default([]),
  published_at: z.string().datetime({ offset: true }).optional(),
});

router.post("/:id/items", requireAuth, async (req: AuthedRequest, res: Response) => {
  const body = req.body;
  const rawItems: unknown[] = Array.isArray(body) ? body : [body];
  if (rawItems.length > MAX_ITEMS_PER_PUBLISH) {
    res.status(400).json({
      error: `Too many items in one publish call (max ${MAX_ITEMS_PER_PUBLISH})`,
    });
    return;
  }
  const parsed = z.array(itemInputSchema).safeParse(rawItems);
  if (!parsed.success) {
    logger.warn({ feedId: req.params.id, issues: parsed.error.issues }, "item validation failed");
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const { data: feed } = await supabaseAdmin
    .from("feeds")
    .select("id, user_id")
    .eq("id", req.params.id)
    .single();
  if (!feed) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (feed.user_id !== req.user!.id) {
    res.status(403).json({ error: "not owner" });
    return;
  }
  if (req.apiKey && req.apiKey.feed_id !== feed.id) {
    res.status(403).json({ error: "API key not valid for this feed" });
    return;
  }

  const { count: existing } = await supabaseAdmin
    .from("feed_items")
    .select("*", { count: "exact", head: true })
    .eq("feed_id", feed.id);
  const currentCount = existing ?? 0;
  if (currentCount + parsed.data.length > MAX_ITEMS_PER_FEED) {
    res.status(429).json({
      error: `Feed has reached its item limit (${MAX_ITEMS_PER_FEED}). Delete older items before publishing more.`,
      current: currentCount,
      limit: MAX_ITEMS_PER_FEED,
    });
    return;
  }

  const rows = parsed.data.map((i) => ({
    feed_id: feed.id,
    external_id: i.id ?? crypto.randomUUID(),
    title: i.title,
    summary: i.summary,
    content: i.content,
    confidence: i.confidence,
    signals: i.signals,
    source_urls: i.source_urls,
    agent_model: i.agent_model,
    tags: i.tags,
    published_at: i.published_at ?? new Date().toISOString(),
  }));

  const { data, error } = await supabaseAdmin.from("feed_items").insert(rows).select();
  if (error) {
    logger.error({ feedId: feed.id, err: error.message }, "item insert failed");
    await supabaseAdmin
      .from("feeds")
      .update({ last_error: error.message, last_error_at: new Date().toISOString() })
      .eq("id", feed.id);
    res.status(400).json({ error: error.message });
    return;
  }
  await supabaseAdmin
    .from("feeds")
    .update({ updated_at: new Date().toISOString(), last_error: null, last_error_at: null })
    .eq("id", feed.id);
  await maybeMarkVerified(feed.id, feed.user_id);
  logger.info({ feedId: feed.id, n: data?.length ?? 0 }, "items published");
  res.status(201).json(Array.isArray(body) ? { items: data } : { item: data?.[0] });

  // Fire-and-forget: notify subscribers via their configured channels
  const { data: feedMeta } = await supabaseAdmin.from("feeds").select("title").eq("id", feed.id).single();
  notifySubscribers(feed.id, feedMeta?.title ?? "AIF Feed", data ?? []).catch((err) =>
    logger.error({ feedId: feed.id, err: (err as Error).message }, "notification dispatch failed"),
  );
});

router.get("/:id/health", async (req, res) => {
  const { data: feed, error } = await supabaseAdmin
    .from("feeds")
    .select("id, last_fetched_at, last_error, last_error_at")
    .eq("id", req.params.id)
    .single();
  if (error || !feed) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const { count } = await supabaseAdmin
    .from("feed_items")
    .select("*", { count: "exact", head: true })
    .eq("feed_id", feed.id);
  const { data: conf } = await supabaseAdmin
    .from("feed_items")
    .select("confidence")
    .eq("feed_id", feed.id)
    .not("confidence", "is", null);
  const confs = (conf ?? []).map((r) => Number(r.confidence)).filter((n) => !Number.isNaN(n));
  const avg_confidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null;
  res.json({
    last_fetched_at: feed.last_fetched_at,
    last_error: feed.last_error,
    last_error_at: feed.last_error_at,
    items_count: count ?? 0,
    avg_confidence,
  });
});

router.post("/:id/refresh", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { data: feed } = await supabaseAdmin
    .from("feeds")
    .select("id, user_id, feed_url")
    .eq("id", req.params.id)
    .single();
  if (!feed) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (feed.user_id !== req.user!.id) {
    res.status(403).json({ error: "not owner" });
    return;
  }
  try {
    const refreshed = await fetchAndStore(feed.id, feed.feed_url);
    res.json({ ok: true, feed: refreshed });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

async function bumpSubscriberCount(feedId: string): Promise<void> {
  const { count } = await supabaseAdmin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("feed_id", feedId);
  await supabaseAdmin
    .from("feeds")
    .update({ subscriber_count: count ?? 0 })
    .eq("id", feedId);
}

export default router;
