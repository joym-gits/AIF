#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { writeConfig, type AgentConfig } from "./config";
import { runOnce, startScheduler } from "./scheduler";

const cmd = process.argv[2];

async function main() {
  switch (cmd) {
    case "init":
      await init();
      return;
    case "test":
      await runOnce(false);
      return;
    case "start":
      startScheduler();
      return;
    default:
      console.log(`Usage:
  aif-agent init     interactive config generator
  aif-agent test     run once and print items (no publishing)
  aif-agent start    start the cron scheduler`);
      process.exit(cmd ? 1 : 0);
  }
}

async function init() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const ask = (q: string, d = "") => rl.question(`${q}${d ? ` [${d}]` : ""}: `).then((v) => v.trim() || d);

  const feed_id = await ask("Feed ID (uuid)");
  const api_key = await ask("API key / Bearer token");
  const schedule = await ask("Cron schedule", "0 8 * * 1");
  const model = await ask("Anthropic model", "claude-sonnet-4-6");
  const domain = await ask("Domain", "general");
  const persona = await ask("Persona", "You are an AI intelligence analyst.");
  const sourcesStr = await ask("Source URLs (comma-separated; prefix with rss: for RSS)");
  const instructions = await ask("Instructions for the agent");
  const max_items = Number(await ask("Max items per run", "3"));

  const sources = sourcesStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) =>
      s.startsWith("rss:")
        ? { type: "rss" as const, url: s.slice(4) }
        : { type: "url" as const, url: s },
    );

  const cfg: AgentConfig = {
    feed_id,
    api_key,
    schedule,
    agent: {
      model,
      domain,
      persona,
      sources,
      instructions,
      output: { max_items, confidence_reasoning: true },
    },
  };
  writeConfig(cfg);
  console.log("\nWrote aif-agent.config.json");
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
