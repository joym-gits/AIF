import { Router } from "express";
import { supabaseAdmin } from "../supabase";
import type { AIFFeed } from "@aif/shared";

const router = Router();

router.get("/:id/aif.json", async (req, res) => {
  const { data: feed, error } = await supabaseAdmin
    .from("feeds")
    .select("*")
    .eq("id", req.params.id)
    .eq("is_public", true)
    .single();
  if (error || !feed) {
    res.status(404).type("application/aif+json").send(JSON.stringify({ error: "not found" }));
    return;
  }

  const { data: items } = await supabaseAdmin
    .from("feed_items")
    .select("*")
    .eq("feed_id", feed.id)
    .order("published_at", { ascending: false })
    .limit(100);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, username")
    .eq("id", feed.user_id)
    .single();

  const body: AIFFeed = {
    aif: "1.0",
    id: feed.id,
    title: feed.title,
    description: feed.description ?? "",
    author: {
      name: profile?.display_name ?? profile?.username ?? "AIF publisher",
      verified: Boolean(feed.is_verified),
    },
    domain: feed.domain ?? "general",
    cadence: feed.cadence ?? "daily",
    language: "en",
    feed_url: feed.feed_url,
    created_at: feed.created_at,
    updated_at: feed.updated_at,
    items: (items ?? []).map((i) => ({
      id: i.external_id ?? i.id,
      title: i.title ?? "",
      summary: i.summary ?? "",
      content: i.content ?? "",
      confidence: Number(i.confidence ?? 0),
      signals: i.signals ?? [],
      source_urls: i.source_urls ?? [],
      agent_model: i.agent_model ?? "manual",
      published_at: i.published_at ?? i.created_at,
      tags: i.tags ?? [],
    })),
  };

  res.type("application/aif+json").send(JSON.stringify(body));
});

export default router;
