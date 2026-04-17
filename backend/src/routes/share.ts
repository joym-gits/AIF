import { Router } from "express";
import { supabaseAdmin } from "../supabase";
import { env } from "../env";
import { renderCard, CardData } from "../services/cardRenderer";

const router = Router();

// Share pages are consumed by external crawlers (WhatsApp, iMessage, Slack, LinkedIn).
// Strip restrictive security headers that block preview rendering.
router.use((_req, res, next) => {
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Frame-Options");
  res.removeHeader("Cross-Origin-Opener-Policy");
  res.removeHeader("Origin-Agent-Cluster");
  res.setHeader("X-Robots-Tag", "noindex");
  next();
});

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

// ── OG Card Image ────────────────────────────────────────────────────
router.get("/items/:id/card.png", async (req, res) => {
  try {
    const { data: item } = await supabaseAdmin
      .from("feed_items")
      .select("*, feeds:feed_id(id, title, feed_url, domain)")
      .eq("id", req.params.id)
      .single();

    if (!item) {
      res.status(404).type("text").send("Item not found");
      return;
    }

    const feed = item.feeds as { id: string; title: string; feed_url: string; domain?: string } | null;

    const cardData: CardData = {
      title: item.title ?? "Untitled",
      summary: item.summary ?? "",
      confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
      signals: Array.isArray(item.signals) ? item.signals : [],
      feedTitle: feed?.title ?? "Feed",
      domain: feed?.domain ?? "general",
    };

    const png = await renderCard(cardData);

    res
      .set("Content-Type", "image/png")
      .set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400")
      .set("CDN-Cache-Control", "public, max-age=3600")
      .send(png);
  } catch (err) {
    console.error("card render error", err);
    res.status(500).type("text").send("Failed to render card");
  }
});

// ── Share page (HTML with OG meta) ───────────────────────────────────
router.get("/items/:id", async (req, res) => {
  const { data: item } = await supabaseAdmin
    .from("feed_items")
    .select("*, feeds:feed_id(id, title, feed_url, domain)")
    .eq("id", req.params.id)
    .single();
  if (!item) {
    res.status(404).type("html").send("<h1>Item not found</h1>");
    return;
  }
  const feed = item.feeds as { id: string; title: string; feed_url: string; domain?: string } | null;
  const shareUrl = `${env.AIF_READER_URL}/items/${item.id}`;
  const ogImageUrl = `${env.AIF_READER_URL}/share/items/${item.id}/card.png`;

  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(item.title)} — AIF</title>
<meta name="description" content="${esc(item.summary)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(item.title)}"/>
<meta property="og:description" content="${esc(item.summary)}"/>
<meta property="og:url" content="${esc(shareUrl)}"/>
<meta property="og:site_name" content="AIF — AI Intelligence Feed"/>
<meta property="og:image" content="${esc(ogImageUrl)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(item.title)}"/>
<meta name="twitter:description" content="${esc(item.summary)}"/>
<meta name="twitter:image" content="${esc(ogImageUrl)}"/>
<link rel="canonical" href="${esc(shareUrl)}"/>
<style>body{background:#0f0f13;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{max-width:600px;background:#1a1a24;border:1px solid #2a2a3a;border-radius:12px;padding:32px;text-align:center}
h1{font-size:22px;margin:0 0 8px}p{color:#94a3b8;margin:4px 0;font-size:14px}
a{color:#6366f1;text-decoration:none}.conf{height:6px;background:#2a2a3a;border-radius:3px;margin:16px 0 8px;overflow:hidden}
.bar{height:100%;border-radius:3px}</style>
</head>
<body>
<div class="card">
  <p style="color:#64748b;font-size:12px">${esc(feed?.title ?? "")} · AIF</p>
  <h1>${esc(item.title)}</h1>
  <p>${esc(item.summary)}</p>
  <div class="conf"><div class="bar" style="width:${Math.round((item.confidence ?? 0) * 100)}%;background:${(item.confidence ?? 0) >= 0.8 ? "#22c55e" : (item.confidence ?? 0) >= 0.5 ? "#f59e0b" : "#ef4444"}"></div></div>
  <p style="font-size:12px">Confidence: ${((item.confidence ?? 0) * 100).toFixed(0)}%</p>
  <p style="margin-top:20px"><a href="${esc(shareUrl)}">Open in AIF Reader →</a></p>
</div>
<script>setTimeout(function(){window.location.href="${esc(shareUrl)}"},1500)</script>
</body>
</html>`);
});

export default router;
