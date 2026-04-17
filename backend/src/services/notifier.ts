import { supabaseAdmin } from "../supabase";
import { logger } from "../lib/logger";
import { env } from "../env";

interface NotificationChannel {
  id: string;
  user_id: string;
  feed_id: string | null;
  channel_type: "webhook" | "email";
  config: Record<string, unknown>;
  enabled: boolean;
}

interface PublishedItem {
  id: string;
  feed_id: string;
  title: string;
  summary: string;
  content?: string;
  confidence?: number;
  signals?: string[];
  source_urls?: string[];
  agent_model?: string;
  published_at: string;
}

export async function notifySubscribers(
  feedId: string,
  feedTitle: string,
  items: PublishedItem[],
): Promise<void> {
  if (items.length === 0) return;

  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("feed_id", feedId);
  if (!subs || subs.length === 0) return;

  const userIds = subs.map((s) => s.user_id);

  const { data: channels } = await supabaseAdmin
    .from("notification_channels")
    .select("*")
    .eq("enabled", true)
    .in("user_id", userIds);
  if (!channels || channels.length === 0) return;

  const matching = (channels as NotificationChannel[]).filter(
    (ch) => ch.feed_id === null || ch.feed_id === feedId,
  );

  for (const ch of matching) {
    try {
      if (ch.channel_type === "webhook") {
        await sendWebhook(ch, feedTitle, items);
      } else if (ch.channel_type === "email") {
        await sendEmail(ch, feedTitle, items);
      }
      await supabaseAdmin
        .from("notification_channels")
        .update({ last_notified_at: new Date().toISOString(), last_error: null })
        .eq("id", ch.id);
    } catch (err) {
      const msg = (err as Error).message;
      logger.error({ channelId: ch.id, type: ch.channel_type, err: msg }, "notification failed");
      await supabaseAdmin
        .from("notification_channels")
        .update({ last_error: msg })
        .eq("id", ch.id);
    }
  }
}

async function sendWebhook(
  ch: NotificationChannel,
  feedTitle: string,
  items: PublishedItem[],
): Promise<void> {
  const url = ch.config.webhook_url as string;
  if (!url) throw new Error("Missing webhook_url in config");

  const payload = {
    event: "aif.items.published",
    feed_title: feedTitle,
    feed_id: items[0]?.feed_id,
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      confidence: i.confidence,
      signals: i.signals,
      published_at: i.published_at,
      url: `${env.AIF_READER_URL}/items/${i.id}`,
    })),
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "AIF-Notifier/1.0" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
  logger.info({ channelId: ch.id, url, items: items.length }, "webhook sent");
}

async function sendEmail(
  ch: NotificationChannel,
  feedTitle: string,
  items: PublishedItem[],
): Promise<void> {
  const frequency = (ch.config.frequency as string) ?? "instant";
  if (frequency !== "instant") return;

  const { data: user } = await supabaseAdmin.auth.admin.getUserById(ch.user_id);
  const email = user?.user?.email;
  if (!email) throw new Error("No email for user");

  const itemsHtml = items
    .map(
      (i) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a">
        <div style="font-weight:600;color:#e2e8f0;font-size:15px">${escHtml(i.title)}</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px">${escHtml(i.summary)}</div>
        <div style="margin-top:8px">
          ${i.confidence != null ? `<span style="color:${i.confidence >= 0.8 ? "#22c55e" : i.confidence >= 0.5 ? "#f59e0b" : "#ef4444"};font-size:12px;font-weight:600">${Math.round(i.confidence * 100)}% confidence</span>` : ""}
          ${(i.signals ?? []).slice(0, 4).map((s) => `<span style="background:#1e293b;color:#94a3b8;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:4px">${escHtml(s)}</span>`).join("")}
        </div>
        <div style="margin-top:8px">
          <a href="${env.AIF_READER_URL}/items/${i.id}" style="color:#6366f1;font-size:12px;text-decoration:none">Read more →</a>
        </div>
      </td>
    </tr>`,
    )
    .join("");

  const html = `
<!doctype html>
<html>
<head><meta charset="utf-8"/></head>
<body style="background:#0f0f13;margin:0;padding:20px;font-family:system-ui,-apple-system,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto">
    <div style="padding:16px;text-align:center">
      <span style="background:#6366f1;color:white;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:700">AIF</span>
      <span style="color:#e2e8f0;margin-left:8px;font-size:14px">New items from <strong>${escHtml(feedTitle)}</strong></span>
    </div>
    <table style="width:100%;background:#1a1a24;border-radius:8px;border:1px solid #2a2a3a" cellpadding="0" cellspacing="0">
      ${itemsHtml}
    </table>
    <div style="text-align:center;padding:16px;color:#64748b;font-size:11px">
      <a href="${env.AIF_READER_URL}" style="color:#6366f1;text-decoration:none">Open AIF Reader</a>
      &nbsp;·&nbsp;
      <a href="${env.AIF_READER_URL}/discover" style="color:#6366f1;text-decoration:none">Discover feeds</a>
    </div>
  </div>
</body>
</html>`;

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {},
    redirectTo: undefined,
  });
  // Supabase doesn't have a raw "send email" API via admin SDK.
  // Use Resend/Postmark/SES via fetch instead.
  const emailProvider = env.EMAIL_PROVIDER_URL;
  if (!emailProvider) {
    logger.warn({ channelId: ch.id }, "email notification skipped — no EMAIL_PROVIDER_URL configured");
    return;
  }

  const res = await fetch(emailProvider, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.EMAIL_PROVIDER_KEY}`,
    },
    body: JSON.stringify({
      from: "AIF <notifications@aif.dev>",
      to: email,
      subject: `${feedTitle} — ${items.length} new item${items.length > 1 ? "s" : ""}`,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Email API returned ${res.status}`);
  logger.info({ channelId: ch.id, to: email, items: items.length }, "email sent");
}

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
