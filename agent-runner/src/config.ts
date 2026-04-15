import fs from "node:fs";
import path from "node:path";

export interface AgentSource {
  type: "rss" | "url";
  url: string;
}

export interface AgentConfig {
  feed_id: string;
  api_key: string;
  schedule: string;
  agent: {
    model: string;
    domain: string;
    persona: string;
    sources: AgentSource[];
    instructions: string;
    output: {
      max_items: number;
      confidence_reasoning?: boolean;
    };
  };
}

export function loadConfig(file = "aif-agent.config.json"): AgentConfig {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) {
    throw new Error(`Config not found at ${full}. Run 'aif-agent init' first.`);
  }
  const raw = fs.readFileSync(full, "utf-8");
  const cfg = JSON.parse(raw) as AgentConfig;
  if (!cfg.feed_id || !cfg.api_key || !cfg.schedule || !cfg.agent) {
    throw new Error(`Invalid config: missing required fields in ${full}`);
  }
  return cfg;
}

export function writeConfig(cfg: AgentConfig, file = "aif-agent.config.json"): void {
  fs.writeFileSync(path.resolve(process.cwd(), file), JSON.stringify(cfg, null, 2) + "\n");
}
