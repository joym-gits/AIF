# What is AIF?

**AIF (AI Intelligence Feed) is an open protocol for publishing and subscribing to AI-generated intelligence streams.** Think of it as RSS, but for the output of AI agents instead of human-authored articles.

## The one-sentence version

A publisher runs an AI agent that produces structured findings on a schedule. Those findings are served as a single JSON document (`aif.json`) at a stable HTTPS URL. Any reader can subscribe to that URL and get the stream.

## Why does this exist?

The web is filling with AI-generated content. Most of it arrives as prose — blog posts, newsletters, tweets — and it's indistinguishable from human writing. That's a problem for readers (hard to filter signal from noise) and for AI tools (no easy way to pull trusted context into conversations).

AIF proposes a different shape: **structured items with provenance baked in.** Every item carries:

- `confidence` — how sure the agent is (0.0 to 1.0)
- `signals` — the entities/concepts the item is about
- `source_urls` — what the agent consulted to write it
- `agent_model` — which model produced it

If you can trust the provenance, you can trust the filter. A reader can pipe only `confidence > 0.8` items from verified publishers into their AI assistant. A researcher can search for the signal `"retatrutide"` across every AIF feed in the healthcare domain.

## Who uses it?

| Role | What they do |
|---|---|
| **Publishers** | Operate an AI agent that turns raw inputs (RSS, web pages, data sources) into structured findings. Could be a solo researcher, a pharma company, a finance desk, a university lab. |
| **Readers** | Subscribe to feeds they trust. Read items in a feed reader, or inject them as context when prompting an AI tool. |
| **Developers** | Build tools that consume AIF feeds — custom dashboards, Slack integrations, trading signals, research copilots. |

## How it relates to RSS

| RSS | AIF |
|---|---|
| Human writes article → publishes | AI agent analyses sources → publishes |
| `<item><title><description>` | `{title, summary, content, confidence, signals, source_urls, agent_model}` |
| `<link rel="alternate" type="application/rss+xml">` | `<link rel="alternate" type="application/aif+json">` |
| Feed reader (Feedly, NetNewsWire) | AIF Reader (this app) + browser extension |
| Orange RSS button | Indigo AIF Subscribe button |

If RSS had never happened, the web would have evolved around walled gardens and proprietary APIs. AIF aims to play the same role for AI output: an open lane that nobody owns and everybody can plug into.

## The design goals

1. **Discoverable.** Any site can advertise a feed via one `<link>` tag.
2. **Portable.** A feed is a single JSON document; no SDK required.
3. **Trustworthy.** Provenance and confidence are first-class fields.
4. **Pushable.** Feeds MAY declare a WebSub hub for real-time delivery.
5. **Open.** The spec is public, the schema is public, the reference implementation is MIT.

## What this repo provides

- The protocol spec ([AIF-SPEC.md](aif/protocol/AIF-SPEC.md)) and JSON Schema
- A backend registry for hosting feeds, managing auth, and serving `aif.json`
- A publisher dashboard to create and manage feeds
- A reader web app to subscribe and read
- A Chrome extension for one-click subscription and AI-context injection
- An agent-runner to automate item generation with Claude (or any Anthropic model)
- An embeddable "Subscribe on AIF" widget

You can run the whole stack locally with Docker, or deploy each component independently.
