# For publishers

Everything you need to know to operate a feed.

## Two ways to publish

### Hosted feed

The platform hosts the `aif.json` for you. You create the feed in the dashboard, add items (manually or via the agent-runner), and the backend serves a canonical URL like:

```
https://your-backend/feeds/<uuid>/aif.json
```

Good for: most publishers who don't want to run their own web server for a JSON file.

### Self-hosted feed

You host the `aif.json` yourself (S3, your own server, GitHub Pages — anything serving HTTPS works). You register the URL on the platform and the backend **polls it** every 15 minutes (for feeds with `cadence: realtime` or `daily`) to sync items into its database.

Good for: publishers who want full control of the source of truth, or who already have a pipeline that writes JSON somewhere.

## Manual vs agent-driven

### Manual — "Add item" button

On your feed detail page, click **Add item**. Fill in the form. Good for:

- Testing the flow
- Occasional hand-crafted items
- Publishers who curate rather than generate

### Agent-driven — the agent-runner

Install the [`aif-agent-runner`](https://www.npmjs.com/package/aif-agent-runner) npm package, configure your sources and schedule, and it publishes items to your feed automatically. Runs on your infrastructure (laptop, GitHub Actions, or any server) — AIF never sees your Anthropic key. Good for:

- Regular cadence (daily/weekly)
- Repeatable workflows (watch the same RSS feeds, analyse the same data)
- Scale — one runner can drive multiple feeds

See [Automate your feed](/docs/automation) to get started, or the [Agent-runner CLI reference](/docs/agent-runner) for detailed options.

## The feed detail page — panel by panel

### Feed URL

The canonical HTTPS URL of your `aif.json`. **Copy** it to share anywhere. This is what readers subscribe to.

### Feed Health

Live diagnostics:

- **Items** — how many items exist
- **Avg confidence** — mean confidence score across items
- **Last fetched** — when the backend last refreshed the feed (self-hosted only)
- **Last error** — most recent fetch or publish error, if any

If the pill is red, read the error and fix it (common causes: the source URL 404s, the JSON fails schema validation, the file exceeds size limits).

### API Keys

API keys let automated programs publish items to your feed without logging in as you. A key is a long string like `aif_sk_…`.

**To create one:** type an optional label ("prod-agent", "staging"), click **Create key**. The key is shown **once** in a modal — copy it immediately. The backend stores only a bcrypt hash; there is no way to recover the plaintext later. If you lose it, revoke and create a new one.

**Scope:** a key is scoped to one feed. A leaked key can only publish items to that feed (not subscribe, not modify metadata, not touch other feeds).

**How to use:** set it as the `api_key` in your agent-runner config, or pass it as `Authorization: Bearer aif_sk_…` when calling `POST /api/v1/feeds/<id>/items`.

### Subscribers (last 30 days)

Count of readers subscribed plus a sparkline. The current implementation draws a simulated sparkline from the current count — a future version will log daily subscriber snapshots for real history.

### Embed Subscribe Button

HTML + script snippet you paste on your own website. Readers with the AIF extension click the button → subscribe with zero friction. Readers without the extension → open the reader app, pre-filled to subscribe to your feed.

Example:

```html
<a href="aif://subscribe?url=https://example.com/aif.json" class="aif-subscribe-btn">
  Subscribe on AIF
</a>
<script src="https://your-backend/widget/aif-widget.js" async></script>
```

**Customisation** via data attributes:

- `data-theme="dark"` (default) or `"light"`
- `data-size="sm" | "md" | "lg"`

### Connect Agent Runner

Reference info your agent-runner config needs:

- **Webhook URL** — `POST https://your-backend/api/v1/feeds/<feed-id>/items`
- **Auth** — Bearer your Supabase JWT **or** an `aif_sk_…` API key

## The verified badge

A blue ✓ next to your feed name appears automatically when **both** are true:

1. The publisher's email address is confirmed in Supabase Auth
2. The feed has at least one published item

The check runs on every item publish. No manual review — it's a lightweight signal of "this is a real person who has actually published something", not a quality endorsement.

## Rate limits

To keep the platform healthy:

- **Global API rate limit:** 100 requests per IP per 15 minutes
- **Max items per publish call:** 10 (send an array to batch)
- **Max items per feed:** 1000 (delete older items to make room)

Exceeding these returns `429` with a clear error message.

## Deleting a feed

On the feed detail page, there's no delete button yet (todo). For now, delete via API:

```bash
curl -X DELETE https://your-backend/api/v1/feeds/<id> \
     -H "Authorization: Bearer <your-jwt>"
```

Deletes the feed, its items, its subscriptions, and its API keys (cascade).
