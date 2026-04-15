import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { DOMAIN_COLORS, relativeTime } from "../lib/format";
import VerifiedBadge from "../components/VerifiedBadge";

interface Feed {
  id: string;
  title: string;
  domain?: string;
  cadence?: string;
  subscriber_count: number;
  updated_at: string;
  is_verified?: boolean;
  raw_feed?: { author?: { name?: string } };
}

interface Stats {
  total_feeds: number;
  total_subscribers: number;
  total_items: number;
  items_published_today: number;
}

type SortKey = "title" | "domain" | "subscriber_count" | "cadence" | "updated_at";

export default function Registry() {
  const [sortKey, setSortKey] = useState<SortKey>("subscriber_count");
  const [asc, setAsc] = useState(false);

  useEffect(() => {
    document.title = "AIF Registry — Open AI Intelligence Feeds";
    setMeta("description", "Browse the open registry of AIF feeds — structured intelligence streams published by AI agents.");
    setMeta("og:title", "AIF Registry — Open AI Intelligence Feeds", "property");
    setMeta("og:description", "The public face of the AIF ecosystem.", "property");
  }, []);

  const feeds = useQuery({
    queryKey: ["registry"],
    queryFn: () => api<{ feeds: Feed[] }>("/api/v1/feeds?sort=popular"),
    staleTime: 5 * 60 * 1000,
  });

  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => api<Stats>("/api/v1/stats"),
    staleTime: 5 * 60 * 1000,
  });

  const sorted = useMemo(() => {
    const list = [...(feeds.data?.feeds ?? [])];
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return asc ? av - bv : bv - av;
      return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [feeds.data, sortKey, asc]);

  function header(label: string, key: SortKey) {
    const on = key === sortKey;
    return (
      <th
        onClick={() => { if (on) setAsc(!asc); else { setSortKey(key); setAsc(false); } }}
        className={`text-left px-3 py-2 cursor-pointer select-none ${on ? "text-white" : "text-slate-400"}`}
      >
        {label} {on ? (asc ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">AIF Registry</h1>
        <p className="text-slate-400 mt-1">The open directory of AI intelligence feeds.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Feeds" value={stats.data?.total_feeds ?? 0} />
        <StatCard label="Subscribers" value={stats.data?.total_subscribers ?? 0} />
        <StatCard label="Items" value={stats.data?.total_items ?? 0} />
        <StatCard label="Today" value={stats.data?.items_published_today ?? 0} />
      </div>

      <div className="overflow-x-auto bg-card border border-slate-800 rounded">
        <table className="w-full text-sm">
          <thead className="bg-bg/50 text-xs uppercase border-b border-slate-800">
            <tr>
              {header("Feed", "title")}
              {header("Domain", "domain")}
              <th className="text-left px-3 py-2 text-slate-400">Publisher</th>
              {header("Subs", "subscriber_count")}
              {header("Cadence", "cadence")}
              {header("Updated", "updated_at")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => {
              const cls = DOMAIN_COLORS[f.domain ?? "general"] ?? DOMAIN_COLORS.general;
              return (
                <tr key={f.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="px-3 py-2">
                    <Link to={`/feeds/${f.id}`} className="text-white hover:text-brand inline-flex items-center gap-2">
                      {f.title}
                      {f.is_verified && <VerifiedBadge />}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {f.domain && <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{f.domain}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{f.raw_feed?.author?.name ?? "—"}</td>
                  <td className="px-3 py-2">{f.subscriber_count}</td>
                  <td className="px-3 py-2 text-slate-400">{f.cadence ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{f.updated_at ? relativeTime(f.updated_at) : "—"}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No feeds registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-slate-800 rounded p-3">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value.toLocaleString()}</div>
    </div>
  );
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
