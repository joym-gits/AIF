import { Router, Response } from "express";
import { z } from "zod";
import nodemailer from "nodemailer";
import { supabaseAdmin } from "../supabase";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { env } from "../env";
import { logger } from "../lib/logger";

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

  // Fire-and-forget welcome message
  sendWelcome(data.channel_type, data.config, req.user!.id).catch((err) =>
    logger.warn({ channelId: data.id, err: (err as Error).message }, "welcome message failed"),
  );
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

async function sendWelcome(
  channelType: string,
  config: Record<string, unknown>,
  userId: string,
): Promise<void> {
  if (channelType === "webhook") {
    const url = config.webhook_url as string;
    if (!url) return;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "AIF-Notifier/1.0" },
      body: JSON.stringify({
        event: "aif.welcome",
        text: "You're in. AIF notifications are now live on this channel.\n\nEvery time a feed you subscribe to publishes new intelligence — analysed, scored, and sourced — it lands right here. No noise, no fluff, just signal.\n\nGo subscribe to some feeds: https://aif-reader.web.app/discover\n\n— AIF",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*You're in.* AIF notifications are now live on this channel.\n\nEvery time a feed you subscribe to publishes new intelligence — analysed, scored, and sourced — it lands right here. No noise, no fluff, just signal.\n\n<https://aif-reader.web.app/discover|Go subscribe to some feeds> and let the agents do the work.\n\n_— AIF_",
            },
          },
        ],
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    logger.info({ channelType, url }, "webhook welcome sent");
  }

  if (channelType === "email") {
    if (!env.SMTP_USER || !env.SMTP_PASS) return;
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = user?.user?.email;
    if (!email) return;

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM || `AIF <${env.SMTP_USER}>`,
      to: email,
      subject: "You're in — AIF notifications are live",
      html: `
<!doctype html>
<html>
<head><meta charset="utf-8"/></head>
<body style="background:#0f0f13;margin:0;padding:20px;font-family:system-ui,-apple-system,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto">
    <div style="text-align:center;padding:24px 0">
      <span style="background:#6366f1;color:white;padding:5px 12px;border-radius:6px;font-size:14px;font-weight:700">AIF</span>
    </div>
    <div style="background:#1a1a24;border:1px solid #2a2a3a;border-radius:12px;padding:32px">
      <h1 style="color:#e2e8f0;font-size:22px;margin:0 0 16px">You're in.</h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 12px">
        AIF email notifications are now live. Every time a feed you subscribe to publishes new intelligence — analysed, scored, and sourced by AI agents — it arrives right here in your inbox.
      </p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px">
        No noise. No algorithmic feeds. Just structured signal from agents you trust.
      </p>
      <div style="text-align:center">
        <a href="https://aif-reader.web.app/discover" style="display:inline-block;background:#6366f1;color:white;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none">
          Discover feeds to subscribe to
        </a>
      </div>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0;text-align:center">
        You can manage or pause notifications anytime from your
        <a href="https://aif-reader.web.app/notifications" style="color:#6366f1;text-decoration:none">notification settings</a>.
      </p>
    </div>
    <p style="color:#4a5568;font-size:11px;text-align:center;margin-top:16px">
      AIF — The open protocol for AI-generated intelligence
    </p>
  </div>
</body>
</html>`,
    });
    logger.info({ channelType, to: email }, "email welcome sent");
  }
}

export default router;
