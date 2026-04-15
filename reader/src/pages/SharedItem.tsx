import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";
import { DOMAIN_COLORS, confidenceColor, relativeTime } from "../lib/format";

interface SharedItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  confidence?: number;
  signals?: string[];
  published_at: string;
  feeds: { id: string; title: string; feed_url: string; domain?: string };
}

export default function SharedItemPage() {
  const { id } = useParams<{ id: string }>();

  const q = useQuery({
    queryKey: ["shared-item", id],
    enabled: !!id,
    queryFn: () => api<{ item: SharedItem }>(`/api/v1/items/${id}`),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const item = q.data?.item;
    if (!item) return;
    document.title = `${item.title} — AIF`;
    setMeta("description", item.summary);
    setMeta("og:title", item.title, "property");
    setMeta("og:description", item.summary, "property");
    setMeta("og:type", "article", "property");
    setMeta("twitter:card", "summary_large_image");
  }, [q.data]);

  if (q.isLoading) return <p className="text-slate-500">Loading…</p>;
  if (!q.data) return <p className="text-rose-400">Item not found.</p>;
  const item = q.data.item;
  const cls = DOMAIN_COLORS[item.feeds.domain ?? "general"] ?? DOMAIN_COLORS.general;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div className="bg-card border border-slate-800 rounded p-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">{item.feeds.title}</span>
          {item.feeds.domain && <span className={`px-2 py-0.5 rounded-full ${cls}`}>{item.feeds.domain}</span>}
          <span className="ml-auto text-slate-500">{relativeTime(item.published_at)}</span>
        </div>
        <h1 className="text-2xl font-bold mt-2">{item.title}</h1>
        <p className="text-slate-300 mt-2">{item.summary}</p>
        <div className="mt-3">
          <div className="h-1 bg-slate-800 rounded overflow-hidden">
            <div
              className={`h-full ${confidenceColor(item.confidence)}`}
              style={{ width: `${(item.confidence ?? 0) * 100}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Confidence: {item.confidence?.toFixed(2) ?? "—"}
          </div>
        </div>
        {item.content && (
          <div className="markdown text-sm mt-4 border-t border-slate-800 pt-4">
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="bg-card border border-slate-800 rounded p-6 text-center">
        <p className="text-slate-300 mb-3">Want more intelligence like this?</p>
        <a
          href={`aif://subscribe?url=${encodeURIComponent(item.feeds.feed_url)}`}
          className="aif-subscribe-btn"
          data-theme="dark"
          data-size="lg"
          data-feed-url={item.feeds.feed_url}
        >Subscribe on AIF</a>
      </div>
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
