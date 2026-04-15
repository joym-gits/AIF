import cron from "node-cron";
import { supabaseAdmin } from "../supabase";
import { fetchAndStore } from "./feedFetcher";

export function startScheduler(): void {
  cron.schedule("*/15 * * * *", async () => {
    console.log("[scheduler] refreshing realtime+daily feeds");
    const { data: feeds, error } = await supabaseAdmin
      .from("feeds")
      .select("id, feed_url, cadence")
      .in("cadence", ["realtime", "daily"]);
    if (error) {
      console.error("[scheduler] fetch feeds failed", error);
      return;
    }
    for (const f of feeds ?? []) {
      try {
        await fetchAndStore(f.id, f.feed_url);
        console.log(`[scheduler] refreshed ${f.id}`);
      } catch (err) {
        console.error(`[scheduler] refresh ${f.id} failed`, err);
      }
    }
  });
  console.log("[scheduler] running every 15 minutes");
}
