import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Link } from "react-router-dom";

interface Channel {
  id: string;
  feed_id: string | null;
  channel_type: "webhook" | "email";
  config: Record<string, unknown>;
  enabled: boolean;
  last_notified_at: string | null;
  last_error: string | null;
}

export default function Notifications() {
  const { session } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    try {
      const { channels } = await api<{ channels: Channel[] }>("/api/v1/me/notifications");
      setChannels(channels);
    } catch { /* ignore */ }
  }
  useEffect(() => { if (session) void load(); }, [session]);

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-300 text-lg mb-4">Sign in to manage notifications</p>
        <Link to="/login" className="px-4 py-2 bg-brand rounded text-white text-sm">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-slate-400 mt-1">Get feed items delivered to Slack, Teams, email, or any webhook.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-brand rounded text-white text-sm">
          Add channel
        </button>
      </div>

      {channels.length === 0 && !showAdd && (
        <div className="bg-card border border-slate-800 rounded p-6 text-center">
          <p className="text-slate-400 mb-4">No notification channels configured yet.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <HintCard
              title="Slack"
              desc="Paste your Slack incoming webhook URL"
              onClick={() => setShowAdd(true)}
            />
            <HintCard
              title="Teams"
              desc="Paste your Teams incoming webhook URL"
              onClick={() => setShowAdd(true)}
            />
            <HintCard
              title="Email digest"
              desc="Get new items delivered to your inbox"
              onClick={() => setShowAdd(true)}
            />
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Webhooks work with Zapier, Make, n8n, and any tool that accepts incoming HTTP.
          </p>
        </div>
      )}

      {channels.map((ch) => (
        <ChannelCard key={ch.id} channel={ch} onUpdate={load} />
      ))}

      {showAdd && <AddChannelModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function HintCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-bg border border-slate-700 rounded p-4 text-left hover:border-brand transition-colors"
    >
      <div className="font-medium text-slate-200">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </button>
  );
}

function ChannelCard({ channel, onUpdate }: { channel: Channel; onUpdate: () => void }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function toggle() {
    await api(`/api/v1/me/notifications/${channel.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !channel.enabled }),
    });
    onUpdate();
  }

  async function remove() {
    if (!confirm("Remove this notification channel?")) return;
    await api(`/api/v1/me/notifications/${channel.id}`, { method: "DELETE" });
    onUpdate();
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      await api(`/api/v1/me/notifications/${channel.id}/test`, { method: "POST" });
      setTestResult("Test sent successfully");
    } catch (e) {
      setTestResult(String(e));
    } finally {
      setTesting(false);
    }
  }

  const label = channel.channel_type === "webhook"
    ? (channel.config.webhook_url as string)?.replace(/^https?:\/\//, "").slice(0, 50)
    : "Email notifications";

  return (
    <div className="bg-card border border-slate-800 rounded p-4">
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          channel.channel_type === "webhook"
            ? "bg-sky-600/30 text-sky-300"
            : "bg-purple-600/30 text-purple-300"
        }`}>
          {channel.channel_type}
        </span>
        <span className="text-sm text-slate-200 flex-1 truncate">{label}</span>
        <span className={`w-2 h-2 rounded-full ${channel.enabled ? "bg-emerald-500" : "bg-slate-600"}`} />
      </div>

      {channel.feed_id && (
        <div className="text-xs text-slate-500 mt-2">Feed-specific: {channel.feed_id.slice(0, 8)}…</div>
      )}
      {!channel.feed_id && (
        <div className="text-xs text-slate-500 mt-2">All subscribed feeds</div>
      )}

      {channel.last_error && (
        <div className="text-xs text-rose-400 mt-2 bg-rose-900/20 px-2 py-1 rounded">{channel.last_error}</div>
      )}

      {channel.last_notified_at && (
        <div className="text-xs text-slate-500 mt-1">Last sent: {new Date(channel.last_notified_at).toLocaleString()}</div>
      )}

      {testResult && (
        <div className={`text-xs mt-2 ${testResult.includes("success") ? "text-emerald-400" : "text-rose-400"}`}>{testResult}</div>
      )}

      <div className="flex gap-2 mt-3">
        {channel.channel_type === "webhook" && (
          <button onClick={test} disabled={testing} className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-300 disabled:opacity-50">
            {testing ? "Sending…" : "Test"}
          </button>
        )}
        <button onClick={toggle} className="text-xs px-3 py-1 rounded border border-slate-700 text-slate-300">
          {channel.enabled ? "Pause" : "Resume"}
        </button>
        <button onClick={remove} className="text-xs px-3 py-1 rounded border border-rose-900 text-rose-300 ml-auto">
          Remove
        </button>
      </div>
    </div>
  );
}

function AddChannelModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"webhook" | "email">("webhook");
  const [url, setUrl] = useState("");
  const [feedId, setFeedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const config: Record<string, unknown> = {};
      if (type === "webhook") config.webhook_url = url;
      if (type === "email") config.frequency = "instant";

      await api("/api/v1/me/notifications", {
        method: "POST",
        body: JSON.stringify({
          channel_type: type,
          config,
          feed_id: feedId || null,
        }),
      });
      onSaved();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-slate-800 rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add notification channel</h2>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setType("webhook")}
            className={`flex-1 py-2 rounded text-sm ${type === "webhook" ? "bg-brand text-white" : "bg-bg text-slate-300 border border-slate-700"}`}
          >
            Webhook
          </button>
          <button
            onClick={() => setType("email")}
            className={`flex-1 py-2 rounded text-sm ${type === "email" ? "bg-brand text-white" : "bg-bg text-slate-300 border border-slate-700"}`}
          >
            Email
          </button>
        </div>

        {type === "webhook" && (
          <div>
            <label className="text-xs text-slate-400">Webhook URL (HTTPS)</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full mt-1 px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
            />
            <p className="text-xs text-slate-500 mt-2">
              Works with Slack, Teams, Zapier, Make, n8n, or any service that accepts incoming webhooks.
              AIF sends a JSON POST with feed title, items, confidence scores, and signals.
            </p>
          </div>
        )}

        {type === "email" && (
          <div>
            <p className="text-sm text-slate-400">
              New items will be sent to your account email as they're published. Beautifully formatted with confidence bars and signal tags.
            </p>
            <p className="text-xs text-slate-500 mt-2">Applies to all your subscribed feeds.</p>
          </div>
        )}

        {type === "webhook" && (
          <div>
            <label className="text-xs text-slate-400">Limit to a specific feed (optional)</label>
            <input
              value={feedId}
              onChange={(e) => setFeedId(e.target.value)}
              placeholder="Leave empty for all subscribed feeds"
              className="w-full mt-1 px-3 py-2 bg-bg border border-slate-700 rounded text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Paste a feed UUID to limit notifications to that feed only.</p>
          </div>
        )}

        {err && <p className="text-rose-400 text-xs">{err}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-slate-700 text-sm">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || (type === "webhook" && !url)}
            className="px-4 py-1.5 rounded bg-brand text-white text-sm disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add channel"}
          </button>
        </div>
      </div>
    </div>
  );
}
