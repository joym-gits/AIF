import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export default function Subscribe() {
  const [params] = useSearchParams();
  const feedUrl = params.get("feed") ?? params.get("url") ?? "";
  const { session, loading } = useAuth();
  const [state, setState] = useState<"idle" | "registering" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!feedUrl || loading || !session || state !== "idle") return;
    (async () => {
      setState("registering");
      try {
        const reg = await api<{ id: string }>("/api/v1/feeds", {
          method: "POST",
          body: JSON.stringify({ feed_url: feedUrl }),
        });
        await api(`/api/v1/feeds/${reg.id}/subscribe`, { method: "POST" });
        setState("done");
      } catch (e) {
        setErr(String(e));
        setState("error");
      }
    })();
  }, [feedUrl, loading, session, state]);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!feedUrl) return <p className="text-slate-400">No feed URL provided.</p>;

  return (
    <div className="max-w-lg mx-auto mt-12 bg-card border border-slate-800 rounded p-6 space-y-3">
      <h1 className="text-xl font-semibold">Subscribe to feed</h1>
      <code className="block text-xs break-all bg-bg p-2 rounded text-slate-300">{feedUrl}</code>
      {!session && (
        <div>
          <p className="text-slate-400 mb-3">Sign in to complete your subscription.</p>
          <Link to="/login" className="px-4 py-2 bg-brand rounded text-white text-sm">Sign in</Link>
        </div>
      )}
      {state === "registering" && <p className="text-slate-400">Registering and subscribing…</p>}
      {state === "done" && (
        <div>
          <p className="text-emerald-400">Subscribed ✓</p>
          <Link to="/" className="inline-block mt-3 px-4 py-2 bg-brand rounded text-white text-sm">Go to your feed</Link>
        </div>
      )}
      {state === "error" && <pre className="text-rose-400 text-xs whitespace-pre-wrap">{err}</pre>}
    </div>
  );
}
