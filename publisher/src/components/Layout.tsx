import { Link, NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function Layout() {
  const { session } = useAuth();
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1 rounded text-sm ${isActive ? "text-white bg-brand" : "text-slate-300 hover:text-white"}`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand flex items-center justify-center text-xs font-bold text-white">AIF</div>
            <span className="font-semibold">Publisher</span>
          </Link>
          <nav className="flex gap-1 ml-6 flex-1">
            <NavLink to="/dashboard" className={navCls}>Dashboard</NavLink>
            <NavLink to="/discover" className={navCls}>Discover</NavLink>
            <NavLink to="/docs" className={navCls}>Docs</NavLink>
          </nav>
          {session && (
            <div className="flex items-center gap-3 text-sm">
              <Link to="/profile" className="text-slate-300 hover:text-white">
                {session.user.email}
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-slate-400 hover:text-white text-xs"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
