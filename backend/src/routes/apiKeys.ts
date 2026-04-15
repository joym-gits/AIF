import { Router, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabase";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { generateApiKey, hashApiKey } from "../lib/apiKeys";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, feed_id, label, last_used_at, created_at")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ api_keys: data });
});

router.post("/", async (req: AuthedRequest, res: Response) => {
  const parsed = z
    .object({ feed_id: z.string().uuid(), label: z.string().max(64).optional() })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  const { data: feed } = await supabaseAdmin
    .from("feeds")
    .select("id, user_id")
    .eq("id", parsed.data.feed_id)
    .single();
  if (!feed || feed.user_id !== req.user!.id) {
    res.status(403).json({ error: "not owner of feed" });
    return;
  }

  const key = generateApiKey();
  const key_hash = await hashApiKey(key);
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .insert({
      user_id: req.user!.id,
      feed_id: parsed.data.feed_id,
      key_hash,
      label: parsed.data.label ?? null,
    })
    .select("id, feed_id, label, created_at")
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json({ api_key: data, key });
});

router.delete("/:id", async (req: AuthedRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from("api_keys")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).end();
});

export default router;
