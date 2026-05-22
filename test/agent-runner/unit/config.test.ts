import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../../../agent-runner/src/config";

let dir = "";
let previousCwd = "";

const validConfig = {
  feed_id: "feed-1",
  api_key: "aif_sk_test",
  schedule: "0 * * * *",
  agent: {
    model: "claude-test",
    domain: "tech",
    persona: "Analyst",
    sources: [{ type: "url", url: "https://example.com" }],
    instructions: "Summarize.",
    output: { max_items: 3 },
  },
};

describe("loadConfig", () => {
  beforeEach(() => {
    previousCwd = process.cwd();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "aif-agent-test-"));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("loads a valid agent config", () => {
    fs.writeFileSync("aif-agent.config.json", JSON.stringify(validConfig));

    expect(loadConfig()).toEqual(validConfig);
  });

  it("throws when the config file is missing", () => {
    expect(() => loadConfig()).toThrow("Config not found");
  });

  it("throws when required fields are missing", () => {
    fs.writeFileSync("aif-agent.config.json", JSON.stringify({ ...validConfig, api_key: "" }));

    expect(() => loadConfig()).toThrow("Invalid config");
  });
});
