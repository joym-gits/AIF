import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { DOMAIN_COLORS, confidenceColor, relativeTime, asContextBlock } from "../lib/format";

export interface ReaderItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  confidence?: number;
  signals?: string[];
  source_urls?: string[];
  agent_model?: string;
  published_at: string;
  feed_id: string;
}

export interface ItemFeedMeta {
  title: string;
  domain?: string;
}

export default function ItemCard({ item, feed }: { item: ReaderItem; feed?: ItemFeedMeta }) {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const domainCls = DOMAIN_COLORS[feed?.domain ?? "general"] ?? DOMAIN_COLORS.general;

  function copyContext() {
    const text = asContextBlock({
      feedTitle: feed?.title ?? "AIF feed",
      title: item.title,
      summary: item.summary,
      signals: item.signals,
      confidence: item.confidence,
      published_at: item.published_at,
    });
    void navigator.clipboard.writeText(text);
  }

  return (
    <article className="bg-card border border-slate-800 rounded p-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">{feed?.title ?? "Feed"}</span>
        {feed?.domain && (
          <span className={`px-2 py-0.5 rounded-full ${domainCls}`}>{feed.domain}</span>
        )}
        <span className="ml-auto text-slate-500">{relativeTime(item.published_at)}</span>
      </div>
      <h3 className="mt-2 text-lg font-bold leading-tight">{item.title}</h3>
      <p className={`mt-1 text-sm text-slate-300 ${open ? "" : "line-clamp-2"}`}>{item.summary}</p>

      <div className="mt-3">
        <div className="h-1 bg-slate-800 rounded overflow-hidden">
          <div
            className={`h-full ${confidenceColor(item.confidence)}`}
            style={{ width: `${(item.confidence ?? 0) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {(item.signals ?? []).slice(0, 3).map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">{s}</span>
          ))}
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto text-xs text-brand hover:underline"
          >
            {open ? "Collapse" : "Read more"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-slate-800 pt-3 space-y-3">
          {item.content && (
            <div className="markdown text-sm">
              <ReactMarkdown>{item.content}</ReactMarkdown>
            </div>
          )}
          {item.signals && item.signals.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.signals.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">{s}</span>
              ))}
            </div>
          )}
          {item.source_urls && item.source_urls.length > 0 && (
            <div className="text-xs">
              <div className="text-slate-400 mb-1">Sources</div>
              <ul className="space-y-1">
                {item.source_urls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer" className="text-brand break-all hover:underline">{u}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2">
            {item.agent_model && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{item.agent_model}</span>
            )}
            <button
              onClick={async () => {
                const url = `${window.location.origin}/share/items/${item.id}`;
                try {
                  await navigator.clipboard.writeText(url);
                } catch {
                  const ta = document.createElement("textarea");
                  ta.value = url;
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  ta.remove();
                }
                setShared(true);
                setTimeout(() => setShared(false), 2000);
              }}
              className={`ml-auto text-xs px-3 py-1 rounded border ${shared ? "border-emerald-500 text-emerald-400" : "border-slate-700 text-slate-200"}`}
            >
              {shared ? "Link copied ✓" : "Share"}
            </button>
            <button
              onClick={copyContext}
              className="text-xs px-3 py-1 rounded bg-brand text-white"
            >
              Copy as context
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
