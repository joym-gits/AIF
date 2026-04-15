import { supabaseAdmin } from "../supabase";
import { logger } from "../lib/logger";

/**
 * Verification = publisher has confirmed email AND the feed has at least one item.
 * Called after an item is published; cheap no-op if already verified.
 */
export async function maybeMarkVerified(feedId: string, userId: string): Promise<void> {
  const { data: feed } = await supabaseAdmin
    .from("feeds")
    .select("is_verified")
    .eq("id", feedId)
    .single();
  if (feed?.is_verified) return;

  const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !userData.user?.email_confirmed_at) return;

  const { count } = await supabaseAdmin
    .from("feed_items")
    .select("*", { count: "exact", head: true })
    .eq("feed_id", feedId);
  if ((count ?? 0) < 1) return;

  await supabaseAdmin.from("feeds").update({ is_verified: true }).eq("id", feedId);
  logger.info({ feedId, userId }, "feed verified");
}
