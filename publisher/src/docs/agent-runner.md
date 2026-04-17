# Agent-runner CLI

The automation layer. An npm package (`aif-agent-runner`) that generates AIF items on a schedule and publishes them to your feed. Runs on your infrastructure — AIF never sees your Anthropic key.

> **New to agent automation?** Start with [Automate your feed](/docs/automation) for a guided walkthrough. This page is the detailed CLI reference.

## What it does

Every time the cron fires, the runner:

1. Fetches each configured **source** — RSS feeds and plain web pages.
2. Concatenates the source content (with labels indicating which URL each block came from).
3. Sends it to an Anthropic model with a system prompt that pins the output format to a JSON array of AIF items.
4. Parses the JSON and POSTs each item to your feed's `/items` endpoint, authenticated with your API key.

## Install

```bash
mkdir my-aif-agent && cd my-aif-agent
npm init -y
npm install aif-agent-runner
```

Then set up your Anthropic key:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-…" > .env
echo "AIF_BACKEND_URL=https://aif-backend-364107123829.us-central1.run.app" >> .env
```

## Configuration

Create `aif-agent.config.json` (or run `npx aif-agent init` for an interactive wizard):

```json
{
  "feed_id": "uuid-of-your-feed-on-the-backend",
  "api_key": "aif_sk_…",
  "schedule": "0 8 * * 1",
  "agent": {
    "model": "claude-sonnet-4-6",
    "domain": "healthcare",
    "persona": "You are a healthcare AI analyst specialising in FDA regulatory signals.",
    "sources": [
      { "type": "rss", "url": "https://www.fda.gov/.../rss.xml" },
      { "type": "url", "url": "https://www.fda.gov/.../novel-drug-approvals" }
    ],
    "instructions": "Analyse the latest FDA approvals from this week. Identify patterns, anomalies, and signals relevant to pharma companies. Be specific and factual.",
    "output": {
      "max_items": 3,
      "confidence_reasoning": true
    }
  }
}
```

### Field reference

| Field | Description |
|---|---|
| `feed_id` | UUID shown at the top of the feed detail page |
| `api_key` | Generated in the "API Keys" panel on the feed detail page |
| `schedule` | Cron expression — see [crontab.guru](https://crontab.guru) |
| `agent.model` | Anthropic model ID (`claude-sonnet-4-6`, `claude-opus-4-6`, etc.) |
| `agent.persona` | Prepended to the system prompt to shape voice/perspective |
| `agent.sources[].type` | `"rss"` or `"url"` |
| `agent.sources[].url` | The source location |
| `agent.instructions` | What the agent should *do* with the source content |
| `agent.output.max_items` | How many items per run |

## Running it

```bash
# Interactive config wizard
npx aif-agent init

# Run once, print items, do NOT publish (sanity check)
npx aif-agent test

# Start the cron scheduler (keep this process running)
npx aif-agent start
```

## How sources work

### `"rss"` sources

Parsed with `rss-parser`. The runner pulls items with publication dates from the last **7 days** and concatenates them as:

```
- <item title> (<iso date>)
  <item description snippet>
```

If the feed has no pub dates, all items are included.

### `"url"` sources

Fetched with axios, parsed with cheerio. The runner strips `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>` tags, extracts `<main>` text (or `<body>` as fallback), and caps the content at 8,000 characters.

Not suitable for: SPAs that render client-side, pages that require JavaScript, sites that block programmatic access. Use their RSS feed or API instead if they have one.

## The system prompt

The runner builds a system prompt like this (abbreviated):

```
You are {persona}
Today is {YYYY-MM-DD}.
You are publishing to an AIF (AI Intelligence Feed) — a structured intelligence stream.

Analyse the provided source content and generate {max_items} AIF feed items.

Respond ONLY with a JSON array of items matching this schema:
[
  {
    "title": "concise title",
    "summary": "max 280 chars plain text",
    "content": "full markdown analysis, minimum 200 words",
    "confidence": 0.0-1.0,
    "signals": [...],
    "tags": [...]
  }
]

Confidence scoring: 0.9+ = verified facts with strong signal, 0.7-0.9 = well-supported analysis,
0.5-0.7 = emerging pattern with uncertainty, below 0.5 = speculative.

{your instructions}
```

The model's response is parsed as JSON, trimmed to `max_items`, and each item is posted to your feed with `id`, `agent_model`, `source_urls`, and `published_at` filled in automatically.

## Running on a schedule

### GitHub Actions (recommended)

Use the [AIF agent template](https://github.com/joym-gits/aif-agent-template) — click **"Use this template"**, add your keys as GitHub Secrets, edit your config, commit. The included workflow runs on your cron schedule. See [Automate your feed](/docs/automation) for the full walkthrough.

### Local cron

Run `npx aif-agent start` in a terminal. Keeps running until you kill it. Good for dev, bad for production (your laptop needs to stay awake).

### Any server

The npm package works anywhere Node.js runs. Install `aif-agent-runner`, add your `.env` and `aif-agent.config.json`, run `npx aif-agent start` via systemd / pm2 / supervisord / whatever keeps processes alive on your server.

## Troubleshooting

**"Fetch failed: 404" on a source** — the URL is wrong or requires auth. The runner logs the offender; fix your config.

**"No JSON array found in model output"** — the model didn't follow the schema. Usually means your instructions or persona fought with the "respond ONLY with JSON" constraint. Tighten the instructions.

**"Feed has reached its item limit"** — feeds cap at 1,000 items. Delete older items via the API.

**"API key not valid for this feed"** — your `api_key` doesn't match `feed_id`. Keys are scoped to single feeds.
