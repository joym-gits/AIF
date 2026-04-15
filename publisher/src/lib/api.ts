import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeaders()), ...(init.headers as Record<string, string> | undefined) };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}
