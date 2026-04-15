import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import ItemCard, { ReaderItem } from "../components/ItemCard";
import VerifiedBadge from "../components/VerifiedBadge";
import { DOMAIN_COLORS } from "../lib/format";

interface Feed {
  id: string;
  title: string;
  description?: string;
  domain?: string;
  cadence?: string;
  subscriber_count: number;
  is_verified?: boolean;
  raw_feed?: { author?: { name?: string } };
}
interface SubRow { feed_id: string }

export default function FeedPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();

  const feed = useQuery({
    queryKey: ["feed", id],
    enabled: !!id,
    queryFn: () => api<{ feed: Feed; items: ReaderItem[] }>(`/api/v1/feeds/${id}`),
    staleTime: 5 * 60 * 1000,
  });

  const subs = useQuery({
    queryKey: ["subs"],
    enabled: !!session,
    queryFn: () => api<{ subscriptions: SubRow[] }>("/api/v1/me/subscriptions"),
    staleTime: 5 * 60 * 1000,
  });

  const subscribed = !!subs.data?.subscriptions.find((s) => s.feed_id === id);

  const toggleSub = useMutation({
    mutationFn: () =>
      api(`/api/v1/feeds/${id}/subscribe`, { method: subscribed ? "DELETE" : "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subs"] }),
  });

  if (feed.isLoading) return <p className="text-slate-500">Loading…</p>;
  if (!feed.data) return <p className="text-rose-400">Feed not found.</p>;

  const f = feed.data.feed;
  const cls = DOMAIN_COLORS[f.domain ?? "general"] ?? DOMAIN_COLORS.general;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              {f.title}
              {f.is_verified && <VerifiedBadge />}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {f.raw_feed?.author?.name ? `by ${f.raw_feed.author.name}` : ""}
            </p>
            <p className="text-slate-300 mt-2">{f.description}</p>
            <div className="flex items-center gap-2 mt-3 text-xs">
              {f.domain && <span className={`px-2 py-0.5 rounded-full ${cls}`}>{f.domain}</span>}
              {f.cadence && <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{f.cadence}</span>}
              <span className="text-slate-500">{f.subscriber_count} subscribers</span>
            </div>
          </div>
          {session && (
            <button
              disabled={toggleSub.isPending}
              onClick={() => toggleSub.mutate()}
              className={`px-4 py-2 rounded text-sm ${
                subscribed ? "border border-slate-700 text-slate-300" : "bg-brand text-white"
              }`}
            >
              {subscribed ? "Unsubscribe" : "Subscribe"}
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3">
        {feed.data.items.map((i) => (
          <ItemCard key={i.id} item={i} feed={{ title: f.title, domain: f.domain }} />
        ))}
      </div>
    </div>
  );
}
