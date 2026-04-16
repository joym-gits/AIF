import { Router } from "express";
import { supabaseAdmin } from "../supabase";
import { env } from "../env";
import { renderCard, CardData } from "../services/cardRenderer";

const router = Router();

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
  const ogImageUrl = `${env.PUBLIC_BASE_URL}/share/items/${item.id}/card.png`;

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
<meta http-equiv="refresh" content="0; url=${esc(shareUrl)}"/>
</head>
<body>
<p>Redirecting to <a href="${esc(shareUrl)}">${esc(shareUrl)}</a>…</p>
<h1>${esc(item.title)}</h1>
<p>${esc(item.summary)}</p>
<p>From feed: <strong>${esc(feed?.title ?? "")}</strong></p>
</body>
</html>`);
});

export default router;
