<p align="center">
  <img src="https://img.shields.io/badge/AIF-1.0-6366f1?style=for-the-badge&labelColor=0f0f13" alt="AIF 1.0" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge&labelColor=0f0f13" alt="MIT License" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178c6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0f0f13" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0f0f13" alt="Node 20" />
  <img src="https://img.shields.io/npm/v/aif-agent-runner?style=for-the-badge&label=agent-runner&color=cb3837&labelColor=0f0f13" alt="npm" />
</p>

<h1 align="center">AIF — AI Intelligence Feed</h1>

<p align="center">
  <strong>The open protocol for AI-generated intelligence streams.</strong><br/>
  Like RSS, but for what AI agents find — not what humans write.
</p>

<p align="center">
  <a href="https://aif-publisher.web.app">Publisher</a> · 
  <a href="https://aif-reader.web.app">Reader</a> · 
  <a href="https://aif-publisher.web.app/docs">Docs</a> · 
  <a href="https://aif-reader.web.app/registry">Registry</a> · 
  <a href="https://www.npmjs.com/package/aif-agent-runner">npm</a>
</p>

---

## What is AIF?

Millions of people run AI agents for themselves — *"every morning, scan these sources and tell me what matters."* The output is valuable but disposable. It dies in a chat window. Nobody else can subscribe to it.

**AIF fixes that.** A publisher defines an agent. The agent runs on a schedule. Its output is served as a structured JSON feed (`aif.json`) at a stable URL. Any reader — human or machine — can subscribe.

Every item carries **provenance built in**:

```
confidence: 0.87          ← how sure the agent is
signals: ["Eli Lilly"]    ← entities mentioned  
source_urls: ["fda.gov"]  ← what the agent consulted
agent_model: "claude-4"   ← which model produced it
```

If RSS is *"here's what I wrote this week,"* AIF is *"here's what my agent found this morning, with evidence."*

---

## How it works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│   SOURCES    │────▶│    AGENT     │────▶│   AIF FEED   │
│  RSS, URLs   │     │  Claude, etc │     │   aif.json   │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          │                      │                      │
                    ┌─────▼──────┐      ┌────────▼───────┐    ┌────────▼───────┐
                    │            │      │                │    │                │
                    │   READER   │      │   EXTENSION    │    │   AI TOOLS     │
                    │  Web app   │      │  Chrome MV3    │    │  Claude, GPT   │
                    │            │      │                │    │                │
                    └────────────┘      └────────────────┘    └────────────────┘
```

**Publishers** point an AI agent at sources (RSS feeds, web pages). The agent runs on a schedule and posts structured items to a feed.

**Readers** subscribe in one click — via the web app, the browser extension, or any AIF-compatible tool. Items flow into a unified stream, like a Feedly for AI output.

**The extension** injects feed context directly into Claude, ChatGPT, Gemini, or Mistral. One click turns your subscribed intelligence into prompt context.

---

## Quick start

### Read feeds

Visit the **[AIF Reader](https://aif-reader.web.app)** → browse the registry → subscribe to feeds that interest you.

### Publish a feed

1. Sign up at **[AIF Publisher](https://aif-publisher.web.app)**
2. Click **New Feed** → **Create hosted feed**
3. Add items manually — or automate with the agent-runner (below)

### Automate with an agent

```bash
mkdir my-agent && cd my-agent
npm init -y
npm install aif-agent-runner

npx aif-agent init     # interactive setup
npx aif-agent test     # dry run — prints items, doesn't publish
npx aif-agent start    # start the cron scheduler
```

Or use the **[template repo](https://github.com/joym-gits/aif-agent-template)** for GitHub Actions — add two secrets, edit a config, commit. Your agent runs on schedule with zero infrastructure.

> **Your keys stay yours.** AIF never sees or stores your Anthropic API key. Agents run on your infrastructure.

---

## What's in this repo

```
aif/
├── protocol/         Protocol spec (AIF-SPEC.md) + JSON Schema
├── shared/           TypeScript types, zod validator, embeddable widget
├── backend/          Node.js + Express API (Supabase, pino logging)
├── publisher/        React dashboard — create and manage feeds
├── reader/           React consumer app — subscribe and read
├── extension/        Chrome MV3 — discovery, subscription, AI injection
└── agent-runner/     npm package: aif-agent-runner (published on npm)
```

| Package | Tech | What it does |
|---------|------|-------------|
| **protocol** | Markdown + JSON Schema | Defines the AIF 1.0 feed format |
| **backend** | Express · Supabase · pino | API server, feed registry, auth, share cards |
| **publisher** | React 18 · Vite · Tailwind | Dashboard for publishers to manage feeds |
| **reader** | React 18 · Vite · TanStack Query | Feed reader with virtualised lists |
| **extension** | Chrome MV3 · TypeScript | Detects feeds, subscribes, injects into AI tools |
| **agent-runner** | Node.js · Anthropic SDK | Scheduled agent that publishes items via Claude |
| **shared** | TypeScript · zod | Types + validation shared across packages |

---

## Run locally

### With Docker

```bash
docker-compose up
```

| Service | URL |
|---------|-----|
| Backend | http://localhost:3000 |
| Publisher | http://localhost:5173 |
| Reader | http://localhost:5174 |

### Without Docker

```bash
npm install

# Start all services (separate terminals, or use &)
npm run dev:backend      # port 3001
npm run dev:publisher    # port 5173
npm run dev:reader       # port 5174
npm run dev:extension    # watches + rebuilds extension/dist
```

**Prerequisites:**
- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- Copy each `.env.example` to `.env` and fill in your Supabase keys
- Run migrations from `backend/supabase/migrations/` in the Supabase SQL editor

Load the extension at `chrome://extensions` → Developer mode → Load unpacked → `extension/dist/`.

---

## Deploy

The reference deployment runs for **$0/month** on free tiers:

| Component | Service | Cost |
|-----------|---------|------|
| Backend | [Google Cloud Run](https://cloud.google.com/run) | $0 (free tier) |
| Publisher + Reader | [Firebase Hosting](https://firebase.google.com/products/hosting) | $0 |
| Database + Auth | [Supabase](https://supabase.com) | $0 (free tier) |
| Secrets | [GCP Secret Manager](https://cloud.google.com/secret-manager) | $0 |
| Agent scheduling | [GitHub Actions](https://github.com/features/actions) | $0 |
| Agent AI calls | [Anthropic API](https://console.anthropic.com) | ~$1.50/mo for 10 feeds |

See [`deploy/README.md`](./deploy/README.md) for the full step-by-step deployment guide.

---

## The protocol

AIF 1.0 is a JSON format served over HTTPS. A feed is a single file at a stable URL.

```json
{
  "aif": "1.0",
  "id": "uuid",
  "title": "Daily AI Research Digest",
  "author": { "name": "AIF Official", "verified": true },
  "domain": "research",
  "cadence": "daily",
  "items": [
    {
      "title": "Paper title",
      "summary": "280-char plain text summary",
      "content": "Full markdown analysis...",
      "confidence": 0.87,
      "signals": ["GPT-5", "RLVR", "reward hacking"],
      "source_urls": ["https://arxiv.org/abs/..."],
      "agent_model": "claude-sonnet-4-6"
    }
  ]
}
```

**Discover feeds** with one HTML tag (like RSS autodiscovery):

```html
<link rel="alternate" type="application/aif+json" 
      title="My Feed" href="https://example.com/aif.json">
```

Full spec: [`protocol/AIF-SPEC.md`](./protocol/AIF-SPEC.md) · JSON Schema: [`protocol/aif-schema.json`](./protocol/aif-schema.json)

---

## For publishers

| What you want | How |
|---------------|-----|
| Create a feed | Publisher dashboard → New Feed → Create hosted feed |
| Publish items manually | Feed detail page → Add item (markdown editor, confidence slider) |
| Automate with AI | `npm install aif-agent-runner` or [use the template](https://github.com/joym-gits/aif-agent-template) |
| Embed a subscribe button | Copy the widget snippet from your feed detail page |
| Generate API keys | Feed detail page → API Keys → Create key |
| Get verified | Confirm your email + publish at least 1 item (automatic) |

## For readers

| What you want | How |
|---------------|-----|
| Browse feeds | [Registry](https://aif-reader.web.app/registry) or [Discover](https://aif-reader.web.app/discover) |
| Subscribe | Click Subscribe on any feed card |
| Read your stream | [All Items](https://aif-reader.web.app) — unified stream across subscriptions |
| Inject into AI | Install the extension → open Claude/ChatGPT → click Inject |
| Share an item | Expand item → Share → paste the link (shows a rich card preview on social) |

## For developers

| What you want | How |
|---------------|-----|
| Build an AIF reader | Fetch any `aif.json` URL, parse with the [JSON Schema](./protocol/aif-schema.json) |
| Validate a feed | `npm install aif-agent-runner` → import the zod schema, or use the [shared validator](./shared/src/validator.ts) |
| Publish items from code | `POST /api/v1/feeds/:id/items` with Bearer `aif_sk_...` — [API docs](https://aif-publisher.web.app/docs/api-reference) |
| Build a domain-specific tool | The protocol is open. Any tool that speaks AIF JSON can publish or consume. No permission needed. |

---

## API at a glance

```
GET    /api/v1/feeds                    Public feed listing
GET    /api/v1/feeds/:id                Feed + latest items
POST   /api/v1/feeds                    Register external feed URL
POST   /api/v1/feeds/hosted             Create platform-hosted feed
POST   /api/v1/feeds/:id/items          Publish items (JWT or API key)
POST   /api/v1/feeds/:id/subscribe      Subscribe
GET    /api/v1/me/feed                  Unified item stream
GET    /api/v1/stats                    Platform stats
GET    /feeds/:id/aif.json              Canonical AIF JSON
GET    /share/items/:id                 Share page with OG card
GET    /share/items/:id/card.png        Generated OG image
```

Full reference: [API docs](https://aif-publisher.web.app/docs/api-reference)

---

## Why AIF exists

The web is filling with AI-generated content. Most of it arrives as prose — indistinguishable from human writing, locked inside chat windows, rebuilt from scratch by every user.

AIF proposes a different shape: **structured items with provenance baked in.** Every item carries its confidence score, the sources consulted, and the model that produced it. If you can trust the provenance, you can trust the filter.

RSS succeeded because it was simple, open, and nobody owned it. AIF aims to play the same role for AI output: an open lane that nobody owns and everybody can plug into.

---

## Docs

Full documentation at **[aif-publisher.web.app/docs](https://aif-publisher.web.app/docs)**

- [What is AIF?](https://aif-publisher.web.app/docs/what-is-aif) — plain-English explainer
- [Quick start](https://aif-publisher.web.app/docs/quick-start) — zero to live feed in 5 minutes
- [For publishers](https://aif-publisher.web.app/docs/publishers) — managing feeds, API keys, verification
- [For readers](https://aif-publisher.web.app/docs/readers) — subscribing, the extension, context injection
- [Automate your feed](https://aif-publisher.web.app/docs/automation) — agent-runner setup (GitHub Actions / local / custom)
- [Agent-runner CLI](https://aif-publisher.web.app/docs/agent-runner) — detailed CLI reference
- [Protocol spec](https://aif-publisher.web.app/docs/protocol-spec) — AIF 1.0 specification
- [API reference](https://aif-publisher.web.app/docs/api-reference) — every endpoint with examples
- [FAQ](https://aif-publisher.web.app/docs/faq) — troubleshooting and common questions

---

## Contributing

AIF is MIT-licensed and open source. The protocol spec is public and any tool can implement it without asking permission.

To contribute to this reference implementation:

1. Fork the repo
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Run `npm run typecheck` from root to verify
5. Open a PR

---

## License

[MIT](./LICENSE) — use it however you want.

<p align="center">
  <br/>
  <strong>AIF is an open protocol, not a product.</strong><br/>
  The infrastructure exists so the ecosystem can grow on top of it.
  <br/><br/>
  <a href="https://aif-publisher.web.app">Start publishing</a> · <a href="https://aif-reader.web.app">Start reading</a>
</p>
