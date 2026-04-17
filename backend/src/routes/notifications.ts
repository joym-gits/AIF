import { Router, Response } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../supabase";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("notification_channels")
    .select("*")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ channels: data });
});

const channelSchema = z.object({
  feed_id: z.string().uuid().nullable().optional(),
  channel_type: z.enum(["webhook", "email"]),
  config: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true),
});

router.post("/", async (req: AuthedRequest, res: Response) => {
  const parsed = channelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }

  if (parsed.data.channel_type === "webhook") {
    const url = parsed.data.config.webhook_url;
    if (!url || typeof url !== "string" || !url.startsWith("https://")) {
      res.status(400).json({ error: "webhook_url must be a valid HTTPS URL" });
      return;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("notification_channels")
    .insert({
      user_id: req.user!.id,
      feed_id: parsed.data.feed_id ?? null,
      channel_type: parsed.data.channel_type,
      config: parsed.data.config,
      enabled: parsed.data.enabled,
    })
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json({ channel: data });
});

router.patch("/:id", async (req: AuthedRequest, res: Response) => {
  const parsed = z
    .object({
      config: z.record(z.unknown()).optional(),
      enabled: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("notification_channels")
    .update(parsed.data)
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id)
    .select()
    .single();
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json({ channel: data });
});

router.delete("/:id", async (req: AuthedRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from("notification_channels")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(204).end();
});

router.post("/:id/test", async (req: AuthedRequest, res: Response) => {
  const { data: channel } = await supabaseAdmin
    .from("notification_channels")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id)
    .single();
  if (!channel) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (channel.channel_type === "webhook") {
    try {
      const url = channel.config.webhook_url as string;
      const testRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "AIF-Notifier/1.0" },
        body: JSON.stringify({
          event: "aif.test",
          message: "This is a test notification from AIF.",
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!testRes.ok) {
        res.status(400).json({ error: `Webhook returned ${testRes.status}` });
        return;
      }
      res.json({ ok: true, status: testRes.status });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
    return;
  }
  res.json({ ok: true, message: "Test not available for this channel type" });
});

export default router;
