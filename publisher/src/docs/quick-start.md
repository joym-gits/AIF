# Quick start

From zero to a live AIF feed in about five minutes.

## 1. Create an account

- Go to the [publisher dashboard](/) and click **Sign in**.
- Switch to **Sign up** in the form. Email + password.
- If your Supabase project has email confirmation enabled, click the link in the confirmation email; otherwise you're immediately logged in.

## 2. Create your first feed

From the dashboard, click **New Feed**. You have two options:

### Option A — "Create hosted feed" (recommended for first run)

The platform generates and serves the `aif.json` for you. Fill in:

- **Title** — what your feed is called
- **Description** — one sentence on what it publishes
- **Domain** — the topic area (healthcare, finance, legal, research, tech, general)
- **Cadence** — how often items are expected (realtime / daily / weekly / monthly)

Click **Create feed**. You land on the feed detail page.

### Option B — "Register existing URL"

If you already host an `aif.json` somewhere, paste the URL. The backend fetches it, validates it against the AIF schema, and registers it. Fails loud if the JSON is invalid.

## 3. Publish your first item

On the feed detail page, click **Add item**. The modal has:

- **Title** — short headline
- **Summary** — ≤ 280 characters, plain text (this is what readers see in their feed)
- **Content** — full markdown analysis
- **Confidence** — slider, 0.0 to 1.0
- **Signals** — comma-separated entities (companies, drugs, people, concepts)
- **Source URLs** — comma-separated links you consulted
- **Tags** — comma-separated topic tags

Click **Save**. Your item appears in the items table. The feed's "Verified" blue ✓ badge appears (if your email is confirmed and you now have ≥ 1 item).

## 4. View it as a reader

1. Open the [reader app](http://localhost:5174) in a new tab. You're already signed in (the reader shares your Supabase session).
2. Go to **Discover**, find your feed, click **Subscribe**.
3. The **Intelligence Pulse** home page shows trending signals and high-confidence items. Click **My Stream** in the sidebar for your unified feed. Your item is there.
4. Click **Read more** to expand it. Try the **Copy as context** button — it formats the item for pasting into any AI chat.

## 5. See the raw feed

Copy the **Feed URL** from the feed detail page and open it in a new browser tab. You'll see the live `aif.json` the backend is serving — this is what other AIF-compatible tools fetch.

Example:

```json
{
  "aif": "1.0",
  "id": "…",
  "title": "Your feed title",
  "items": [
    { "id": "…", "title": "Your first item", "summary": "…", … }
  ]
}
```

## 6. (Optional) Automate it with the agent-runner

Manual item entry is fine for testing, but AIF is at its best when an AI agent produces items on a cron schedule. See [Automate your feed](/docs/automation) for the full walkthrough. Summary:

1. On your feed page, open **API Keys**, create a key, copy it once.
2. Use the [template repo](https://github.com/joym-gits/aif-agent-template) → click **"Use this template"** → add your Anthropic key and AIF API key as GitHub Secrets.
3. Edit `aif-agent.config.json` with your feed ID, sources, and instructions.
4. Commit — the workflow runs on your schedule automatically.

Or locally: `npm install aif-agent-runner` → `npx aif-agent init` → `npx aif-agent test` → `npx aif-agent start`.

## 7. (Optional) Install the extension

1. `npm run build --workspace=extension`
2. In Chrome, go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select `extension/dist/`.
3. Visit any page that has a `<link rel="alternate" type="application/aif+json">` tag. The extension badge shows the count.
4. Visit claude.ai / chatgpt.com / gemini — you'll see a floating pill. Open the popup's "My Feeds" tab and click **Inject into AI** on any cached item.

## 8. (Optional) Set up notifications

Get notified when new items land in your subscribed feeds — no need to keep the reader open.

1. In the reader, open **Notifications** from the sidebar.
2. Click **Add channel** and choose **Webhook** (Slack, Teams, Zapier, or any URL) or **Email**.
3. Enter the target URL or email address and save. A test message is sent immediately to confirm it works.

You can manage channels programmatically via `GET/POST/PATCH/DELETE /api/v1/me/notifications`. See the [API reference](/docs/api-reference) for details.

## What next?

- Embed the **Subscribe button** on your website — see [For publishers](/docs/publishers).
- Read the [Protocol spec](/docs/protocol-spec) if you're building tooling.
- Read [For readers](/docs/readers) if you're trying to get intelligence *out* of AIF rather than put it in.
