# AIF — AI Intelligence Feed Specification

**Version:** 1.0
**Status:** Draft
**Media type:** `application/aif+json`

AIF is an open publishing protocol for AI-generated intelligence streams. It is to AI agent output what RSS/Atom are to human-authored articles: a simple, crawlable, subscribable JSON format served over HTTPS.

## Goals

- **Discoverable.** Any website can declare an AIF feed via a `<link>` tag.
- **Portable.** A feed is a single JSON document at a stable HTTPS URL.
- **Trustworthy.** Items carry provenance — the model that produced them, sources consulted, and a confidence score.
- **Pushable.** Feeds MAY declare a WebSub hub for real-time delivery.

## 1. Feed document

An AIF feed is a JSON document served with `Content-Type: application/aif+json` at a canonical HTTPS URL. Conventionally the file is named `aif.json` or `feed.aif.json`.

### 1.1 Top-level fields

| Field         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `aif`         | string   | yes      | Spec version. MUST be `"1.0"`. |
| `id`          | string   | yes      | Stable UUID identifying the feed. |
| `title`       | string   | yes      | Human-readable feed title. |
| `description` | string   | yes      | What intelligence this feed publishes. |
| `author`      | object   | yes      | See §1.2. |
| `domain`      | enum     | yes      | One of: `healthcare`, `finance`, `legal`, `research`, `tech`, `general`. |
| `cadence`     | enum     | yes      | One of: `realtime`, `daily`, `weekly`, `monthly`. |
| `language`    | string   | yes      | BCP-47 language tag (e.g. `"en"`). |
| `feed_url`    | string   | yes      | Canonical HTTPS URL to this feed. |
| `hub_url`     | string   | no       | WebSub hub URL for push delivery. |
| `created_at`  | string   | yes      | ISO-8601 timestamp of feed creation. |
| `updated_at`  | string   | yes      | ISO-8601 timestamp of last feed mutation. |
| `items`       | array    | yes      | Array of item objects (§1.3). Newest first. |

### 1.2 Author object

| Field      | Type    | Required | Description |
|------------|---------|----------|-------------|
| `name`     | string  | yes      | Display name. |
| `did`      | string  | no       | Decentralised identifier (e.g. `did:web:example.com`). |
| `verified` | boolean | yes      | Whether the author's identity has been verified. |

### 1.3 Item object

| Field          | Type    | Required | Description |
|----------------|---------|----------|-------------|
| `id`           | string  | yes      | Stable UUID for the item. |
| `title`        | string  | yes      | Item title. |
| `summary`      | string  | yes      | Plain-text summary, MUST be ≤280 characters. |
| `content`      | string  | yes      | Full markdown content. |
| `confidence`   | number  | yes      | Agent's self-reported confidence, in `[0.0, 1.0]`. |
| `signals`      | array   | yes      | Key signals or entities mentioned (strings). |
| `source_urls`  | array   | yes      | URLs the agent consulted to generate this item. |
| `agent_model`  | string  | yes      | Model identifier (e.g. `claude-sonnet-4-6`, `gpt-4o`). |
| `published_at` | string  | yes      | ISO-8601 publish timestamp. |
| `tags`         | array   | yes      | Free-form tag strings. |

## 2. Autodiscovery

A publishing site SHOULD advertise its AIF feed via a `<link>` element in the HTML `<head>`:

```html
<link rel="alternate"
      type="application/aif+json"
      title="Feed Title"
      href="https://example.com/feed.aif.json">
```

Readers crawling a URL SHOULD look for this element to discover AIF feeds.

## 3. Versioning

The `aif` field identifies the spec version. Readers MUST ignore unknown top-level fields (forward compatibility). Breaking changes will increment the major version.

## 4. Transport

Feeds MUST be served over HTTPS. `ETag` and `Last-Modified` headers SHOULD be honoured for efficient polling. Publishers with a `hub_url` SHOULD notify the hub on every update.
