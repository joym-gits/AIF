import { Router } from "express";
import { supabaseAdmin } from "../supabase";

const router = Router();

router.get("/", async (_req, res) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [statsRes, feedsRes, recentItemsRes, weekItemsRes] = await Promise.all([
    supabaseAdmin.from("feeds").select("domain, subscriber_count", { count: "exact" }).eq("is_public", true),
    supabaseAdmin.from("feeds").select("id, title, domain, subscriber_count, cadence").eq("is_public", true).order("subscriber_count", { ascending: false }).limit(10),
    supabaseAdmin.from("feed_items").select("id, feed_id, title, summary, confidence, signals, published_at").order("published_at", { ascending: false }).limit(50),
    supabaseAdmin.from("feed_items").select("id, feed_id, signals, confidence, published_at").gte("published_at", weekAgo.toISOString()),
  ]);

  // Domain breakdown
  const domainCounts: Record<string, { feeds: number; subscribers: number }> = {};
  for (const f of statsRes.data ?? []) {
    const d = f.domain ?? "general";
    if (!domainCounts[d]) domainCounts[d] = { feeds: 0, subscribers: 0 };
    domainCounts[d].feeds++;
    domainCounts[d].subscribers += f.subscriber_count ?? 0;
  }
  const domains = Object.entries(domainCounts)
    .map(([domain, counts]) => ({ domain, ...counts }))
    .sort((a, b) => b.feeds - a.feeds);

  // Trending signals (from last 7 days)
  const signalFreq: Record<string, number> = {};
  for (const item of weekItemsRes.data ?? []) {
    for (const s of (item.signals as string[]) ?? []) {
      const key = s.toLowerCase().trim();
      if (key.length > 1) signalFreq[key] = (signalFreq[key] ?? 0) + 1;
    }
  }
  const trendingSignals = Object.entries(signalFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([signal, count]) => ({ signal, count }));

  // High-confidence items (>0.8, last 50)
  const highConfidence = (recentItemsRes.data ?? [])
    .filter((i) => (i.confidence ?? 0) >= 0.8)
    .slice(0, 6);

  // Feed item counts this week
  const feedItemCounts: Record<string, number> = {};
  for (const item of weekItemsRes.data ?? []) {
    feedItemCounts[item.feed_id] = (feedItemCounts[item.feed_id] ?? 0) + 1;
  }

  // Most active feeds
  const activeFeedsRaw = (feedsRes.data ?? []).map((f) => ({
    id: f.id,
    title: f.title,
    domain: f.domain,
    subscriber_count: f.subscriber_count,
    items_this_week: feedItemCounts[f.id] ?? 0,
  }));
  const activeFeeds = activeFeedsRaw
    .sort((a, b) => b.items_this_week - a.items_this_week)
    .slice(0, 6);

  // Items published today
  const itemsToday = (weekItemsRes.data ?? []).filter(
    (i) => new Date(i.published_at).getTime() >= todayStart.getTime(),
  ).length;

  // Average confidence this week
  const weekConfs = (weekItemsRes.data ?? [])
    .map((i) => i.confidence as number)
    .filter((c) => c != null && !isNaN(c));
  const avgConfidence = weekConfs.length
    ? weekConfs.reduce((a, b) => a + b, 0) / weekConfs.length
    : null;

  res.json({
    total_feeds: statsRes.count ?? 0,
    total_items_this_week: weekItemsRes.data?.length ?? 0,
    items_today: itemsToday,
    avg_confidence: avgConfidence,
    domains,
    trending_signals: trendingSignals,
    high_confidence_items: highConfidence,
    active_feeds: activeFeeds,
  });
});

export default router;
