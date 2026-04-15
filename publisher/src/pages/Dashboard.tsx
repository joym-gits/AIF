import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Feed {
  id: string;
  title: string;
  description?: string;
  domain?: string;
  subscriber_count: number;
}

interface Profile { feeds: Feed[]; totalItems: number }

export default function Dashboard() {
  const [state, setState] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { feeds } = await api<{ feeds: Feed[] }>("/api/v1/feeds?sort=new");
        let totalItems = 0;
        await Promise.all(
          feeds.map(async (f) => {
            try {
              const { total } = await api<{ total: number }>(`/api/v1/feeds/${f.id}/items?page_size=1`);
              totalItems += total;
            } catch { /* ignore */ }
          }),
        );
        setState({ feeds, totalItems });
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);

  if (err) return <p className="text-rose-400">{err}</p>;
  if (!state) return <p className="text-slate-500">Loading…</p>;

  const totalSubs = state.feeds.reduce((a, f) => a + (f.subscriber_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link to="/feeds/new" className="px-4 py-2 bg-brand rounded text-white text-sm font-medium">
          New Feed
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total feeds" value={state.feeds.length} />
        <Stat label="Total subscribers" value={totalSubs} />
        <Stat label="Items published" value={state.totalItems} />
      </div>

      <section>
        <h2 className="text-sm uppercase text-slate-400 mb-2">Your feeds</h2>
        <div className="space-y-2">
          {state.feeds.length === 0 && <p className="text-slate-500">No feeds yet.</p>}
          {state.feeds.map((f) => (
            <Link
              key={f.id}
              to={`/feeds/${f.id}`}
              className="block bg-card border border-slate-800 rounded p-4 hover:border-brand"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.title}</div>
                  <div className="text-xs text-slate-400">{f.description}</div>
                </div>
                <div className="text-sm text-slate-400">{f.subscriber_count} subs</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-slate-800 rounded p-4">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}
