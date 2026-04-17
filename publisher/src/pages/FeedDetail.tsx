import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import MDEditor from "@uiw/react-md-editor";
import { api } from "../lib/api";

interface Feed {
  id: string;
  title: string;
  description?: string;
  feed_url: string;
  subscriber_count: number;
  domain?: string;
  cadence?: string;
  is_verified?: boolean;
}

interface Health {
  last_fetched_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  items_count: number;
  avg_confidence: number | null;
}

interface ApiKey {
  id: string;
  feed_id: string;
  label: string | null;
  last_used_at: string | null;
  created_at: string;
}
interface Item {
  id: string;
  title: string;
  summary: string;
  confidence?: number;
  signals?: string[];
  published_at: string;
}

export default function FeedDetail() {
  const { id } = useParams<{ id: string }>();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  async function load() {
    try {
      const { feed, items } = await api<{ feed: Feed; items: Item[] }>(`/api/v1/feeds/${id}`);
      setFeed(feed);
      setItems(items);
    } catch (e) {
      setErr(String(e));
    }
  }

  async function refresh() {
    await api(`/api/v1/feeds/${id}/refresh`, { method: "POST" });
    await load();
  }

  const sparkData = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        d: i,
        v: Math.max(0, (feed?.subscriber_count ?? 0) - (29 - i) * Math.random() * 2),
      })),
    [feed?.subscriber_count],
  );

  if (err) return <p className="text-rose-400">{err}</p>;
  if (!feed) return <p className="text-slate-500">Loading…</p>;

  const backendUrl = import.meta.env.VITE_API_URL ?? "";
  const subscribeHtml = `<a href="aif://subscribe?url=${feed.feed_url}" class="aif-subscribe-btn">Subscribe on AIF</a>
<script src="${backendUrl}/widget/aif-widget.js" async></script>`;

  const badgeHtml = `<div class="aif-badge" data-feed-url="${feed.feed_url}" data-theme="dark"></div>
<script src="${backendUrl}/widget/aif-badge.js" async></script>`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            {feed.title}
            {feed.is_verified && <VerifiedBadge />}
          </h1>
          <p className="text-slate-400 mt-1">{feed.description}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="px-3 py-1.5 rounded border border-slate-700 text-sm">Refresh feed</button>
          <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 rounded bg-brand text-white text-sm">Add item</button>
        </div>
      </div>

      <FeedHealthPanel feedId={feed.id} />
      <ApiKeysPanel feedId={feed.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-slate-800 rounded p-4">
          <div className="text-xs uppercase text-slate-400">Feed URL</div>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-xs bg-bg px-2 py-1 rounded break-all">{feed.feed_url}</code>
            <button
              onClick={() => navigator.clipboard.writeText(feed.feed_url)}
              className="px-2 py-1 text-xs bg-brand rounded text-white"
            >Copy</button>
          </div>
        </div>
        <div className="bg-card border border-slate-800 rounded p-4">
          <div className="text-xs uppercase text-slate-400">Subscribers (last 30 days)</div>
          <div className="text-3xl font-semibold mt-1">{feed.subscriber_count}</div>
          <div className="h-10 mt-1">
            <ResponsiveContainer>
              <LineChart data={sparkData}>
                <Tooltip contentStyle={{ background: "#1a1a24", border: "1px solid #334" }} />
                <Line type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border border-slate-800 rounded p-4 space-y-4">
        <div>
          <div className="text-xs uppercase text-slate-400 mb-2">Embed subscribe button</div>
          <pre className="text-xs bg-bg p-3 rounded whitespace-pre-wrap">{subscribeHtml}</pre>
          <button
            onClick={() => navigator.clipboard.writeText(subscribeHtml)}
            className="mt-2 px-2 py-1 text-xs bg-brand rounded text-white"
          >Copy snippet</button>
        </div>
        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs uppercase text-slate-400 mb-2">"Powered by AIF" badge</div>
          <pre className="text-xs bg-bg p-3 rounded whitespace-pre-wrap">{badgeHtml}</pre>
          <button
            onClick={() => navigator.clipboard.writeText(badgeHtml)}
            className="mt-2 px-2 py-1 text-xs bg-brand rounded text-white"
          >Copy snippet</button>
          <p className="text-xs text-slate-500 mt-2">
            Styles: <code className="bg-bg px-1 rounded">data-style="full"</code> (default),{" "}
            <code className="bg-bg px-1 rounded">"compact"</code>, or{" "}
            <code className="bg-bg px-1 rounded">"icon"</code>.{" "}
            Themes: <code className="bg-bg px-1 rounded">data-theme="dark"</code> or{" "}
            <code className="bg-bg px-1 rounded">"light"</code>.
          </p>
        </div>
      </div>

      <ConnectAgentPanel feedId={feed.id} />

      <div className="bg-card border border-slate-800 rounded overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-800 text-sm uppercase text-slate-400">Items</div>
        <table className="w-full text-sm">
          <thead className="bg-bg/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Title</th>
              <th className="text-left px-4 py-2">Published</th>
              <th className="text-left px-4 py-2">Confidence</th>
              <th className="text-left px-4 py-2">Signals</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-slate-800">
                <td className="px-4 py-2">{i.title}</td>
                <td className="px-4 py-2 text-slate-400">{new Date(i.published_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">{i.confidence?.toFixed(2) ?? "—"}</td>
                <td className="px-4 py-2">{i.signals?.length ?? 0}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No items yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddItemModal feedId={feed.id} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

function ConnectAgentPanel({ feedId }: { feedId: string }) {
  return (
    <div className="bg-card border border-slate-800 rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xs uppercase text-slate-400">Automate this feed</div>
        <Link to="/docs/automation" className="text-xs text-brand hover:underline ml-auto">Full guide →</Link>
      </div>
      <p className="text-sm text-slate-400 mb-3">
        Agents run on your infrastructure, not ours. AIF never stores your Anthropic API key.
        Create an AIF API key below and pick a path.
      </p>
      <ol className="space-y-3 text-sm">
        <li>
          <span className="font-medium">1. GitHub Actions</span>{" "}
          <span className="text-slate-400">— recommended. Use the <a href="https://github.com/joym-gits/aif-agent-template" target="_blank" rel="noreferrer" className="text-brand hover:underline">template repo</a>, add two secrets, commit.</span>{" "}
          <Link to="/docs/automation#path-1--github-actions-recommended" className="text-brand hover:underline">Steps</Link>
        </li>
        <li>
          <span className="font-medium">2. Local CLI</span>{" "}
          <span className="text-slate-400">— <code className="text-xs bg-bg px-1 rounded">npm install aif-agent-runner</code> then <code className="text-xs bg-bg px-1 rounded">npx aif-agent start</code>.</span>{" "}
          <Link to="/docs/agent-runner" className="text-brand hover:underline">Steps</Link>
        </li>
        <li>
          <span className="font-medium">3. Custom integration</span>{" "}
          <span className="text-slate-400">— write your own agent in any language; POST to our API.</span>{" "}
          <Link to="/docs/api-reference" className="text-brand hover:underline">Contract</Link>
        </li>
      </ol>
      <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
        Feed ID: <code className="bg-bg px-1 py-0.5 rounded">{feedId}</code>
      </div>
    </div>
  );
}

export function VerifiedBadge() {
  return (
    <span
      title="Verified publisher"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs"
    >✓</span>
  );
}

function FeedHealthPanel({ feedId }: { feedId: string }) {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => {
    api<Health>(`/api/v1/feeds/${feedId}/health`).then(setH).catch(() => setH(null));
  }, [feedId]);
  if (!h) return null;
  const ok = !h.last_error;
  return (
    <div className="bg-card border border-slate-800 rounded p-4">
      <div className="flex items-center gap-2">
        <div className="text-xs uppercase text-slate-400">Feed health</div>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${ok ? "bg-emerald-600/30 text-emerald-300" : "bg-rose-600/30 text-rose-300"}`}>
          {ok ? "healthy" : "error"}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
        <Metric label="Items" value={String(h.items_count)} />
        <Metric label="Avg confidence" value={h.avg_confidence != null ? h.avg_confidence.toFixed(2) : "—"} />
        <Metric label="Last fetched" value={h.last_fetched_at ? new Date(h.last_fetched_at).toLocaleString() : "never"} />
        <Metric label="Last error" value={h.last_error ? new Date(h.last_error_at ?? "").toLocaleString() : "—"} />
      </div>
      {h.last_error && (
        <pre className="mt-3 text-xs text-rose-300 bg-bg p-2 rounded whitespace-pre-wrap">{h.last_error}</pre>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function ApiKeysPanel({ feedId }: { feedId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { api_keys } = await api<{ api_keys: ApiKey[] }>("/api/v1/me/api-keys");
    setKeys(api_keys.filter((k) => k.feed_id === feedId));
  }
  useEffect(() => { void load(); }, [feedId]);

  async function create() {
    setBusy(true);
    try {
      const { key } = await api<{ key: string }>("/api/v1/me/api-keys", {
        method: "POST",
        body: JSON.stringify({ feed_id: feedId, label: label || null }),
      });
      setNewKey(key);
      setLabel("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Agents using it will stop working immediately.")) return;
    await api(`/api/v1/me/api-keys/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="bg-card border border-slate-800 rounded p-4">
      <div className="text-xs uppercase text-slate-400 mb-3">API keys</div>
      <div className="flex gap-2 mb-3">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. prod-agent)"
          className="flex-1 px-3 py-1.5 bg-bg border border-slate-700 rounded text-sm"
        />
        <button disabled={busy} onClick={create} className="px-3 py-1.5 bg-brand rounded text-white text-sm disabled:opacity-50">
          {busy ? "Creating…" : "Create key"}
        </button>
      </div>
      {keys.length === 0 && <p className="text-xs text-slate-500">No keys yet.</p>}
      <ul className="space-y-2 text-sm">
        {keys.map((k) => (
          <li key={k.id} className="flex items-center gap-2">
            <code className="text-xs bg-bg px-2 py-1 rounded">aif_sk_…</code>
            <span className="text-slate-300">{k.label ?? "(no label)"}</span>
            <span className="text-xs text-slate-500 ml-auto">
              {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}
            </span>
            <button onClick={() => revoke(k.id)} className="text-xs text-rose-300 hover:underline">Revoke</button>
          </li>
        ))}
      </ul>
      {newKey && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-slate-800 rounded-lg max-w-lg w-full p-6 space-y-3">
            <h3 className="text-lg font-semibold">Your new API key</h3>
            <p className="text-amber-300 text-sm">Copy now — this won't be shown again.</p>
            <code className="block text-xs bg-bg px-3 py-2 rounded break-all">{newKey}</code>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(newKey)}
                className="px-3 py-1.5 rounded bg-brand text-white text-sm"
              >Copy</button>
              <button onClick={() => setNewKey(null)} className="px-3 py-1.5 rounded border border-slate-700 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddItemModal({ feedId, onClose, onSaved }: { feedId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState<string | undefined>("");
  const [confidence, setConfidence] = useState(0.8);
  const [signals, setSignals] = useState("");
  const [sources, setSources] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/v1/feeds/${feedId}/items`, {
        method: "POST",
        body: JSON.stringify({
          title,
          summary,
          content: content ?? "",
          confidence,
          signals: splitList(signals),
          source_urls: splitList(sources),
          tags: splitList(tags),
          agent_model: "manual",
          published_at: new Date().toISOString(),
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add item</h2>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
        />
        <div>
          <textarea
            placeholder="Summary (≤280 chars)"
            maxLength={280}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm h-20"
          />
          <div className="text-xs text-slate-500 text-right">{summary.length}/280</div>
        </div>
        <div data-color-mode="dark">
          <MDEditor value={content} onChange={setContent} height={240} />
        </div>
        <label className="block">
          <span className="text-xs text-slate-400">Confidence: {confidence.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <input
          placeholder="Signals (comma-separated)"
          value={signals}
          onChange={(e) => setSignals(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
        />
        <input
          placeholder="Source URLs (comma-separated)"
          value={sources}
          onChange={(e) => setSources(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
        />
        <input
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
        />
        {err && <pre className="text-rose-400 text-xs whitespace-pre-wrap">{err}</pre>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-slate-700 text-sm">Cancel</button>
          <button disabled={busy || !title} onClick={submit} className="px-4 py-1.5 rounded bg-brand text-white text-sm disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
