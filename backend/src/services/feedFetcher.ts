import { validateAIFFeed, AIFFeed } from "@aif/shared";
import { supabaseAdmin } from "../supabase";
import { logger } from "../lib/logger";
import { maybeMarkVerified } from "./verification";

export async function fetchAndStore(feedId: string, feedUrl: string): Promise<AIFFeed> {
  try {
    const res = await fetch(feedUrl, {
      headers: { Accept: "application/aif+json, application/json" },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const json = await res.json();
    const result = validateAIFFeed(json);
    if (!result.ok) {
      throw new Error(`Invalid AIF: ${JSON.stringify(result.errors)}`);
    }
    const feed = result.feed;

    const { count } = await supabaseAdmin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("feed_id", feedId);

    await supabaseAdmin
      .from("feeds")
      .update({
        title: feed.title,
        description: feed.description,
        domain: feed.domain,
        cadence: feed.cadence,
        raw_feed: feed,
        last_fetched_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
        subscriber_count: count ?? 0,
      })
      .eq("id", feedId);

    if (feed.items.length > 0) {
      const rows = feed.items.map((i) => ({
        feed_id: feedId,
        external_id: i.id,
        title: i.title,
        summary: i.summary,
        content: i.content,
        confidence: i.confidence,
        signals: i.signals,
        source_urls: i.source_urls,
        agent_model: i.agent_model,
        tags: i.tags,
        published_at: i.published_at,
      }));
      await supabaseAdmin
        .from("feed_items")
        .upsert(rows, { onConflict: "feed_id,external_id" });
    }

    const { data: owner } = await supabaseAdmin
      .from("feeds")
      .select("user_id")
      .eq("id", feedId)
      .single();
    if (owner?.user_id) await maybeMarkVerified(feedId, owner.user_id);

    logger.info({ feedId, items: feed.items.length }, "feed fetched");
    return feed;
  } catch (err) {
    const msg = (err as Error).message;
    logger.error({ feedId, feedUrl, err: msg }, "feed fetch failed");
    await supabaseAdmin
      .from("feeds")
      .update({ last_error: msg, last_error_at: new Date().toISOString() })
      .eq("id", feedId);
    throw err;
  }
}
