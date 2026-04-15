import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Feed { id: string; title: string; description?: string; domain?: string; subscriber_count: number }

export default function Discover() {
  const [q, setQ] = useState("");
  const [feeds, setFeeds] = useState<Feed[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const { feeds } = await api<{ feeds: Feed[] }>(
        `/api/v1/feeds?${q ? `search=${encodeURIComponent(q)}&` : ""}sort=popular`,
      );
      setFeeds(feeds);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Discover</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search feeds…"
        className="w-full px-3 py-2 bg-card border border-slate-700 rounded text-sm"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {feeds.map((f) => (
          <Link key={f.id} to={`/feeds/${f.id}`} className="bg-card border border-slate-800 rounded p-4 hover:border-brand">
            <div className="font-medium">{f.title}</div>
            <div className="text-xs text-slate-400">{f.description}</div>
            <div className="text-xs mt-2 text-slate-500">{f.subscriber_count} subscribers</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
