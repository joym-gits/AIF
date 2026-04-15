import { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import ItemCard, { ReaderItem } from "../components/ItemCard";

interface SubRow { feed_id: string; feeds: { id: string; title: string; domain?: string } }

export default function AllItems() {
  const { session, loading } = useAuth();
  const parentRef = useRef<HTMLDivElement>(null);

  const subs = useQuery({
    queryKey: ["subs"],
    enabled: !!session,
    queryFn: () => api<{ subscriptions: SubRow[] }>("/api/v1/me/subscriptions"),
    staleTime: 5 * 60 * 1000,
  });

  const stream = useQuery({
    queryKey: ["me-feed"],
    enabled: !!session,
    queryFn: () => api<{ items: ReaderItem[] }>("/api/v1/me/feed?page=1&page_size=100"),
    staleTime: 5 * 60 * 1000,
  });

  const items = stream.data?.items ?? [];
  const feedById = new Map<string, { title: string; domain?: string }>();
  subs.data?.subscriptions.forEach((s) => feedById.set(s.feed_id, { title: s.feeds.title, domain: s.feeds.domain }));

  const virt = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 6,
  });

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!session) {
    return (
      <EmptyState
        title="Sign in to subscribe to feeds"
        action={<Link to="/login" className="px-4 py-2 bg-brand rounded text-white text-sm">Sign in</Link>}
      />
    );
  }
  if (subs.data && subs.data.subscriptions.length === 0) {
    return (
      <EmptyState
        title="Discover feeds to subscribe to"
        action={<Link to="/discover" className="px-4 py-2 bg-brand rounded text-white text-sm">Discover</Link>}
      />
    );
  }

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Intelligence Feed</h1>
        <p className="text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      </header>

      {stream.isLoading && <p className="text-slate-500">Loading items…</p>}
      {items.length === 0 && !stream.isLoading && <p className="text-slate-500">No items yet.</p>}

      <div ref={parentRef} className="h-[calc(100vh-180px)] overflow-y-auto">
        <div style={{ height: virt.getTotalSize(), position: "relative", width: "100%" }}>
          {virt.getVirtualItems().map((row) => {
            const item = items[row.index];
            return (
              <div
                key={item.id}
                ref={virt.measureElement}
                data-index={row.index}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` }}
                className="pb-3"
              >
                <ItemCard item={item} feed={feedById.get(item.feed_id)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <div className="text-center py-20">
      <p className="text-slate-300 text-lg mb-4">{title}</p>
      {action}
    </div>
  );
}
