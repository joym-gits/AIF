import cron from "node-cron";
import { loadConfig } from "./config";
import { runAgent } from "./agent";
import { publishItem } from "./publisher";

export async function runOnce(publish = true): Promise<void> {
  const cfg = loadConfig();
  const started = new Date().toISOString();
  console.log(`[${started}] agent run starting (feed=${cfg.feed_id})`);
  try {
    const items = await runAgent(cfg);
    console.log(`[agent] generated ${items.length} items`);
    if (!publish) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }
    const sourceUrls = cfg.agent.sources.map((s) => s.url);
    let published = 0;
    for (const item of items) {
      try {
        await publishItem(cfg.feed_id, cfg.api_key, item, cfg.agent.model, sourceUrls);
        published++;
      } catch (err) {
        console.error(`[publisher] failed:`, (err as Error).message);
      }
    }
    console.log(`[${new Date().toISOString()}] run complete: ${published}/${items.length} published`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] run failed:`, err);
  }
}

export function startScheduler(): void {
  const cfg = loadConfig();
  if (!cron.validate(cfg.schedule)) {
    throw new Error(`Invalid cron expression: ${cfg.schedule}`);
  }
  console.log(`[scheduler] starting with schedule "${cfg.schedule}"`);
  cron.schedule(cfg.schedule, () => {
    void runOnce(true);
  });
}
