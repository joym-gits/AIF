import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const supabaseAnon: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
);

export function supabaseFor(userJwt: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
