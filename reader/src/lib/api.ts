import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  Object.assign(headers, init.headers as Record<string, string> | undefined);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}
