import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../lib/auth";

export default function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
