import { Router } from "express";
import { supabaseAdmin } from "../supabase";

const router = Router();

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

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
  const readerUrl = process.env.AIF_READER_URL ?? "https://reader.aif.dev";
  const shareUrl = `${readerUrl}/items/${item.id}`;

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
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(item.title)}"/>
<meta name="twitter:description" content="${esc(item.summary)}"/>
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
