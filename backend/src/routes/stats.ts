import { Router } from "express";
import { supabaseAdmin } from "../supabase";

const router = Router();

router.get("/", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [feedsC, subsC, itemsC, todayC] = await Promise.all([
    supabaseAdmin.from("feeds").select("*", { count: "exact", head: true }).eq("is_public", true),
    supabaseAdmin.from("subscriptions").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("feed_items").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("feed_items")
      .select("*", { count: "exact", head: true })
      .gte("published_at", todayStart.toISOString()),
  ]);

  res.json({
    total_feeds: feedsC.count ?? 0,
    total_subscribers: subsC.count ?? 0,
    total_items: itemsC.count ?? 0,
    items_published_today: todayC.count ?? 0,
  });
});

export default router;
