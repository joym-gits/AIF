export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const DOMAIN_COLORS: Record<string, string> = {
  healthcare: "bg-emerald-600/30 text-emerald-300",
  finance: "bg-blue-600/30 text-blue-300",
  legal: "bg-amber-600/30 text-amber-300",
  research: "bg-purple-600/30 text-purple-300",
  tech: "bg-sky-600/30 text-sky-300",
  general: "bg-slate-600/40 text-slate-200",
};

export function confidenceColor(c?: number): string {
  if (c == null) return "bg-slate-700";
  if (c > 0.8) return "bg-emerald-500";
  if (c >= 0.5) return "bg-amber-500";
  return "bg-rose-500";
}

export function asContextBlock(args: {
  feedTitle: string;
  title: string;
  summary: string;
  signals?: string[];
  confidence?: number;
  published_at: string;
}): string {
  const date = new Date(args.published_at).toISOString().slice(0, 10);
  return [
    `[AIF CONTEXT — ${args.feedTitle} — ${date}]`,
    args.title,
    args.summary,
    `Signals: ${(args.signals ?? []).join(", ")}`,
    `Confidence: ${args.confidence?.toFixed(2) ?? "n/a"}`,
    `[END AIF CONTEXT]`,
  ].join("\n");
}
