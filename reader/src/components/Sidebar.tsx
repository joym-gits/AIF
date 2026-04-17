import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

interface SubRow { feed_id: string; feeds: { id: string; title: string; subscriber_count?: number } }

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useAuth();
  const subs = useQuery({
    queryKey: ["subs"],
    enabled: !!session,
    queryFn: () => api<{ subscriptions: SubRow[] }>("/api/v1/me/subscriptions"),
    staleTime: 5 * 60 * 1000,
  });

  const link = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-1.5 rounded text-sm ${isActive ? "bg-brand text-white" : "text-slate-300 hover:bg-slate-800"}`;

  return (
    <aside className="w-64 h-screen bg-card border-r border-slate-800 flex flex-col p-4">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2 mb-6">
        <div className="w-7 h-7 rounded bg-brand flex items-center justify-center text-xs font-bold text-white">AIF</div>
        <span className="font-semibold">AIF Reader</span>
      </Link>

      {session && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
            {session.user.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-slate-300 truncate">{session.user.email}</span>
        </div>
      )}

      <nav className="space-y-1">
        <NavLink to="/" className={link} onClick={onNavigate} end>All Items</NavLink>
        <NavLink to="/discover" className={link} onClick={onNavigate}>Discover</NavLink>
        {session && <NavLink to="/notifications" className={link} onClick={onNavigate}>Notifications</NavLink>}
      </nav>

      <div className="mt-6 mb-2 text-xs uppercase tracking-wide text-slate-500">My feeds</div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {!session && <p className="text-xs text-slate-500 px-3">Sign in to subscribe</p>}
        {session && subs.data?.subscriptions.length === 0 && (
          <p className="text-xs text-slate-500 px-3">No subscriptions yet</p>
        )}
        {subs.data?.subscriptions.map((s) => (
          <NavLink key={s.feed_id} to={`/feeds/${s.feed_id}`} className={link} onClick={onNavigate}>
            <span className="truncate inline-block max-w-[160px] align-middle">{s.feeds.title}</span>
          </NavLink>
        ))}
      </div>

      <div className="border-t border-slate-800 pt-3 mt-3 space-y-1 text-sm">
        <a
          href={`${import.meta.env.VITE_PUBLISHER_URL ?? "http://localhost:5173"}/docs`}
          target="_blank"
          rel="noreferrer"
          className="block px-3 py-1.5 text-slate-300 hover:bg-slate-800 rounded"
        >
          Docs ↗
        </a>
        {session ? (
          <button
            onClick={() => supabase.auth.signOut()}
            className="block w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 rounded"
          >
            Log out
          </button>
        ) : (
          <Link to="/login" onClick={onNavigate} className="block px-3 py-1.5 text-brand hover:bg-slate-800 rounded">
            Log in
          </Link>
        )}
      </div>
    </aside>
  );
}
