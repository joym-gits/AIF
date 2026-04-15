import { Router, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabase";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/subscriptions", async (req: AuthedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("feed_id, created_at, feeds(*)")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ subscriptions: data });
});

router.get("/feed", async (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size ?? 25)));

  const { data: subs, error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .select("feed_id")
    .eq("user_id", req.user!.id);
  if (subErr) {
    res.status(500).json({ error: subErr.message });
    return;
  }
  const feedIds = (subs ?? []).map((s) => s.feed_id);
  if (feedIds.length === 0) {
    res.json({ items: [], page, page_size: pageSize, total: 0 });
    return;
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabaseAdmin
    .from("feed_items")
    .select("*", { count: "exact" })
    .in("feed_id", feedIds)
    .order("published_at", { ascending: false })
    .range(from, to);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data, page, page_size: pageSize, total: count ?? 0 });
});

router.get("/profile", async (req: AuthedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.user!.id)
    .single();
  if (error) {
    res.status(404).json({ error: error.message });
    return;
  }
  res.json({ profile: data });
});

router.patch("/profile", async (req: AuthedRequest, res: Response) => {
  const parsed = z
    .object({
      username: z.string().min(2).max(32).optional(),
      display_name: z.string().max(64).optional(),
      bio: z.string().max(500).optional(),
      avatar_url: z.string().url().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(parsed.data)
    .eq("id", req.user!.id)
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json({ profile: data });
});

export default router;
