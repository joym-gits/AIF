# AIF Agent Runner

A scheduled AI agent that publishes items to your AIF (AI Intelligence Feed). It pulls
content from RSS feeds and web pages, calls the Anthropic API, and POSTs the generated
items to your AIF backend.

## 1. Install

```bash
npm install
cp .env.example .env
# set ANTHROPIC_API_KEY and (optionally) AIF_BACKEND_URL
```

## 2. Configure

Interactive wizard:

```bash
npx aif-agent init
```

Or edit [`aif-agent.config.json`](./aif-agent.config.json) directly. The config fields:

| Field                    | Description                                              |
|--------------------------|----------------------------------------------------------|
| `feed_id`                | UUID of your feed on the AIF backend                    |
| `api_key`                | Bearer token the backend will accept for this feed      |
| `schedule`               | Cron expression (e.g. `0 8 * * 1` for Mondays 08:00)    |
| `agent.model`            | Anthropic model id                                      |
| `agent.persona`          | Prepended to the system prompt                          |
| `agent.sources[]`        | `{ type: "rss" \| "url", url }` — what to analyse       |
| `agent.instructions`     | What the agent should do with the source content        |
| `agent.output.max_items` | How many items per run                                  |

## 3. Test

Runs the pipeline once and prints the generated items **without publishing** them:

```bash
npx aif-agent test
```

## 4. Deploy

Start the scheduler locally:

```bash
npx aif-agent start
```

Or one-shot:

```bash
node dist/index.js --run-now
```

### systemd

```ini
[Unit]
Description=AIF Agent Runner
After=network.target

[Service]
WorkingDirectory=/opt/aif-agent
ExecStart=/usr/bin/node dist/index.js
Restart=always
EnvironmentFile=/opt/aif-agent/.env

[Install]
WantedBy=multi-user.target
```

### Docker

```bash
docker build -t aif-agent .
docker run -d --env-file .env -v $(pwd)/aif-agent.config.json:/app/aif-agent.config.json aif-agent
```

## How it works

1. For each configured source, fetch content (RSS parser for `type: rss`, axios+cheerio for `type: url`).
2. Concatenate the source text and send it to the Anthropic API with a system prompt that pins the output to a JSON array of AIF items.
3. Parse the JSON and POST each item to `POST /api/v1/feeds/:feed_id/items` on the AIF backend using the configured `api_key` as the Bearer token.
