import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { DOMAIN_COLORS, confidenceColor, relativeTime } from "../lib/format";

interface Insights {
  total_feeds: number;
  total_items_this_week: number;
  items_today: number;
  avg_confidence: number | null;
  domains: { domain: string; feeds: number; subscribers: number }[];
  trending_signals: { signal: string; count: number }[];
  high_confidence_items: {
    id: string;
    feed_id: string;
    title: string;
    summary: string;
    confidence: number;
    signals: string[];
    published_at: string;
  }[];
  active_feeds: {
    id: string;
    title: string;
    domain: string;
    subscriber_count: number;
    items_this_week: number;
  }[];
}

export default function Pulse() {
  const { data, isLoading } = useQuery({
    queryKey: ["insights"],
    queryFn: () => api<Insights>("/api/v1/insights"),
    staleTime: 2 * 60 * 1000,
  });

  const date = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (isLoading || !data) {
    return <p className="text-slate-500 py-8">Loading intelligence pulse…</p>;
  }

  const maxDomainFeeds = Math.max(...data.domains.map((d) => d.feeds), 1);
  const maxSignalCount = Math.max(...data.trending_signals.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Intelligence Pulse</h1>
        <p className="text-sm text-slate-500">{date}</p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active feeds" value={data.total_feeds} />
        <StatCard label="Items this week" value={data.total_items_this_week} />
        <StatCard label="Published today" value={data.items_today} />
        <StatCard
          label="Avg confidence"
          value={data.avg_confidence != null ? `${Math.round(data.avg_confidence * 100)}%` : "—"}
          color={data.avg_confidence != null && data.avg_confidence >= 0.8 ? "text-emerald-400" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trending signals */}
        <div className="bg-card border border-slate-800 rounded p-4">
          <div className="text-xs uppercase text-slate-400 mb-3 tracking-wide">Trending signals this week</div>
          {data.trending_signals.length === 0 && (
            <p className="text-sm text-slate-500">No signals yet.</p>
          )}
          <div className="space-y-2">
            {data.trending_signals.map((s) => (
              <div key={s.signal} className="flex items-center gap-2">
                <span className="text-sm text-slate-200 w-32 truncate">{s.signal}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-brand rounded"
                    style={{ width: `${(s.count / maxSignalCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Domain activity */}
        <div className="bg-card border border-slate-800 rounded p-4">
          <div className="text-xs uppercase text-slate-400 mb-3 tracking-wide">Domain activity</div>
          {data.domains.length === 0 && (
            <p className="text-sm text-slate-500">No domains yet.</p>
          )}
          <div className="space-y-3">
            {data.domains.map((d) => {
              const cls = DOMAIN_COLORS[d.domain] ?? DOMAIN_COLORS.general;
              return (
                <div key={d.domain} className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs w-24 text-center ${cls}`}>
                    {d.domain}
                  </span>
                  <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(d.feeds / maxDomainFeeds) * 100}%`,
                        backgroundColor: d.domain === "healthcare" ? "#22c55e"
                          : d.domain === "finance" ? "#3b82f6"
                          : d.domain === "research" ? "#8b5cf6"
                          : d.domain === "tech" ? "#0ea5e9"
                          : d.domain === "legal" ? "#f59e0b"
                          : "#64748b",
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-16 text-right">
                    {d.feeds} feed{d.feeds !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* High confidence items */}
      <div className="bg-card border border-slate-800 rounded p-4">
        <div className="text-xs uppercase text-slate-400 mb-3 tracking-wide">
          High-confidence items
          <span className="ml-2 text-slate-600 normal-case">&gt;80% confidence</span>
        </div>
        {data.high_confidence_items.length === 0 && (
          <p className="text-sm text-slate-500">No high-confidence items recently.</p>
        )}
        <div className="space-y-3">
          {data.high_confidence_items.map((item) => (
            <Link
              key={item.id}
              to={`/items/${item.id}`}
              className="block p-3 bg-bg rounded hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-200">{item.title}</div>
                  <div className="text-xs text-slate-500 mt-1 truncate">{item.summary}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-semibold ${confidenceColor(item.confidence).replace("bg-", "text-")}`}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                  <span className="text-[10px] text-slate-600">{relativeTime(item.published_at)}</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1 bg-slate-800 rounded overflow-hidden">
                  <div
                    className={`h-full ${confidenceColor(item.confidence)}`}
                    style={{ width: `${item.confidence * 100}%` }}
                  />
                </div>
              </div>
              {item.signals?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {item.signals.slice(0, 4).map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">{s}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Most active feeds */}
      <div className="bg-card border border-slate-800 rounded p-4">
        <div className="text-xs uppercase text-slate-400 mb-3 tracking-wide">Most active feeds</div>
        {data.active_feeds.length === 0 && (
          <p className="text-sm text-slate-500">No activity yet.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data.active_feeds.map((f) => {
            const cls = DOMAIN_COLORS[f.domain] ?? DOMAIN_COLORS.general;
            return (
              <Link
                key={f.id}
                to={`/feeds/${f.id}`}
                className="flex items-center gap-3 p-3 bg-bg rounded hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{f.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${cls}`}>{f.domain}</span>
                    <span className="text-[10px] text-slate-500">{f.subscriber_count} subs</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-semibold text-slate-200">{f.items_this_week}</div>
                  <div className="text-[10px] text-slate-500">this week</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="bg-card border border-slate-800 rounded p-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color ?? "text-slate-100"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
