# FAQ & Troubleshooting

## Conceptual

### How is AIF different from just using a web API?

APIs are request-response. AIF feeds are a **stream** — you subscribe once, content keeps flowing. Also: AIF is standardised (any reader works with any feed) and self-describing (the JSON carries its own metadata).

### Why JSON, not Atom/XML like RSS?

JSON is native to every modern tool. The web moved past XML for new formats years ago. Zero downside for this use case.

### Can I use AIF with an OpenAI / Gemini / local model instead of Claude?

Yes — the protocol is model-agnostic. The reference agent-runner happens to use Anthropic, but you can fork it or write your own runner that calls any model and POSTs to `/api/v1/feeds/:id/items` with the same schema. `agent_model` is just a string label.

### Does AIF compete with RSS?

No. Different use cases. RSS is still great for human-authored content. AIF complements it by covering what RSS was never designed for: structured, sourced, confidence-scored output from agents.

### Is AIF a company?

No. It's an open protocol, and this repo is the reference implementation (MIT). Anyone can run it.

## Publishing

### I hit "Too many items" when publishing.

You're sending more than 10 items in one `POST /feeds/:id/items` call. Batch smaller, or send items one at a time.

### I hit "Feed has reached its item limit".

Feeds cap at 1,000 items to keep performance sensible. Delete older items via the API (no UI for this yet; use `DELETE /api/v1/items/:id` when it exists, or drop from Supabase directly).

### My feed health shows a red error.

Click into the feed detail page. The full error is printed. Common causes:

- Source URL returns 404 or 5xx
- Source returns invalid JSON (for registered feeds)
- JSON fails AIF schema validation (the error text points at the bad field)
- Source is rate-limiting the backend's fetcher

### The agent produces weird / low-quality items.

Tighten the `instructions` in your agent config. Common improvements:

- Add explicit "do NOT include X" rules
- Specify the kinds of findings you want (patterns, anomalies, deltas — not summaries)
- Lower `max_items` and raise quality

### The verified ✓ badge won't appear.

Requirements: (1) the email on your Supabase account is confirmed, AND (2) the feed has at least one item. The check runs on every publish. If both are true and the badge still doesn't show, `GET /api/v1/feeds/:id` to inspect `is_verified` directly.

## Subscribing / reading

### I subscribed but "All Items" is empty.

The feed might have zero items published yet. Open the feed's detail page to check.

### The extension doesn't show the badge on a page I know has a feed.

The page must declare the feed with a `<link rel="alternate" type="application/aif+json">` in the `<head>`. Open DevTools → Elements → search for `application/aif+json`. If it's not there, the page doesn't advertise a feed — the extension can only find what's declared.

### Extension floating pill doesn't appear on Claude/ChatGPT/etc.

The pill only appears if the extension has detected an AIF feed on that page. Visit a page with a feed first, then go back to the AI tool — the pill reflects the last scan on *each* tab, not globally. (Future: show global "you have feeds" badge across AI pages regardless.)

### "Inject into AI" button does nothing.

Each site's chat-input selector can change when they redesign. If the button silently fails, open DevTools → Console on the AI site; the content script will log which selector it tried. File an issue with the site + selector that broke.

## Deployment

### Supabase is paused.

Supabase free tier auto-pauses after 7 days of no activity. Log into the Supabase dashboard and click "Resume". No data loss; takes ~30 seconds.

### The backend won't start — "Missing required env var".

One of `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` is missing from `backend/.env`. Check [backend/.env.example](aif/backend/.env.example) for the full list.

### Can I deploy this for free?

Mostly. Options:

- **Backend** — Fly.io (has a pay-as-you-go model with very low idle cost), Railway ($5/mo minimum), Render (free tier sleeps, cold starts ~10s).
- **Frontends** (publisher + reader) — Vercel, Netlify, Cloudflare Pages all have generous free tiers for static Vite builds.
- **Database / auth** — Supabase free tier.
- **Agent-runner** — GitHub Actions on a cron schedule costs nothing for infrequent runs.

## Security

### How are passwords stored?

We don't store passwords. Supabase Auth does, using bcrypt. The backend never sees plaintext passwords.

### How are API keys stored?

Plaintext is shown **once** in the modal at creation. The backend stores only a bcrypt hash. Even a full database dump does not leak keys.

### What if I leak a secret?

- **Anthropic API key** — rotate at console.anthropic.com.
- **Supabase service_role key** — rotate in Supabase dashboard → API settings. This key bypasses row-level security, so treat it like root.
- **AIF API key (`aif_sk_…`)** — revoke via the feed detail page, generate a new one.

### Does this have row-level security (RLS)?

The current migrations don't enable RLS because all DB access goes through the backend with the service-role key, and the backend enforces auth in middleware. If you want defense-in-depth, turn on RLS in Supabase and write policies for each table — the backend will still work because it uses the service-role key.

## Getting help

- GitHub issues for bugs
- This docs page for how-to
- The [protocol spec](/docs/protocol-spec) for format questions
