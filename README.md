# AIF — AI Intelligence Feed

AIF is an **open protocol for AI-generated intelligence streams**. Like RSS, but for AI
agents: a publisher defines an agent, the agent runs on a schedule, and the items it
produces are served as a canonical JSON document (`aif.json`) that any reader can
subscribe to.

This monorepo contains everything needed to run an end-to-end AIF deployment.

```
aif/
├── protocol/      AIF-SPEC.md and the JSON Schema for the feed format
├── shared/        TypeScript types + zod validator, plus the embeddable widget JS
├── backend/       Node.js + Express API (Supabase auth, pino logging)
├── publisher/     React dashboard to register and manage feeds
├── reader/        React consumer app (like Feedly, for AIF feeds)
├── extension/     Chrome MV3 extension — discovery, subscription, injection
└── agent-runner/  Node.js scheduled agent that pushes items to your feed
```

## Run locally

```bash
# From the repo root:
docker-compose up
```

This starts:

| Service    | Port | URL                     |
|------------|------|-------------------------|
| backend    | 3000 | http://localhost:3000   |
| publisher  | 5173 | http://localhost:5173   |
| reader     | 5174 | http://localhost:5174   |

Populate `backend/.env`, `publisher/.env`, `reader/.env` from their `.env.example`
files first. The backend needs Supabase URL + service role key.

Run the database migrations from `backend/supabase/migrations/` against your Supabase
project (Supabase CLI: `supabase db push`, or paste into the SQL editor).

### Without Docker

```bash
npm install
npm run dev:backend      # port 3001
npm run dev:publisher    # port 5173
npm run dev:reader       # port 5174
npm run dev:extension    # watches and rebuilds /extension/dist
```

Load the unpacked extension from `extension/dist/` in `chrome://extensions`.

## Deploy

- **backend** — any Node host. We recommend [Fly.io](https://fly.io) (`fly launch`
  with the included `backend/Dockerfile`), [Railway](https://railway.app), or
  [Render](https://render.com). Set the same env vars as in `backend/.env.example`.
- **publisher + reader** — static output from `vite build`. Deploy the `dist/`
  folders to [Vercel](https://vercel.com), [Netlify](https://netlify.com), or
  Cloudflare Pages. Set `VITE_API_URL` to the backend's public URL.
- **agent-runner** — see [`agent-runner/README.md`](./agent-runner/README.md) for
  systemd and Docker recipes.

## How to register a feed

1. Sign in on the publisher dashboard.
2. Click **New Feed** → *Register existing feed URL* if you already host an
   `aif.json`, or *Create hosted feed* to have the platform generate one for you.
3. From the feed detail page, copy the embed snippet (an `<a class="aif-subscribe-btn">`
   plus the widget `<script>` tag) and paste it on your site. Any visitor with the AIF
   extension installed can subscribe in one click.

## How to use the agent-runner

The agent-runner is a small Node process that:

1. Fetches your configured sources (RSS + URLs).
2. Asks Claude (or any Anthropic model) to produce AIF items.
3. POSTs those items to your feed using an API key generated in the publisher dashboard.

Full walkthrough: [`agent-runner/README.md`](./agent-runner/README.md).

## The protocol

See [`protocol/AIF-SPEC.md`](./protocol/AIF-SPEC.md) for the full 1.0 specification,
and [`protocol/aif-schema.json`](./protocol/aif-schema.json) for the JSON Schema. A
minimal feed:

```json
{
  "aif": "1.0",
  "id": "…",
  "title": "My Feed",
  "description": "What this feed publishes",
  "author": { "name": "You", "verified": false },
  "domain": "research",
  "cadence": "daily",
  "language": "en",
  "feed_url": "https://example.com/aif.json",
  "created_at": "…",
  "updated_at": "…",
  "items": []
}
```

Advertise it with:

```html
<link rel="alternate" type="application/aif+json" title="My Feed"
      href="https://example.com/aif.json">
```

## Licence

MIT.
