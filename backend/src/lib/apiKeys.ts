import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../supabase";

export const API_KEY_PREFIX = "aif_sk_";

export function generateApiKey(): string {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString("base64url");
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  feed_id: string;
  key_hash: string;
}

/**
 * Look up an api key by comparing against every hash for the given feed.
 * O(n_keys_for_feed) bcrypt compares per request — fine since a feed has a handful of keys.
 */
export async function verifyApiKey(
  key: string,
  feedId?: string,
): Promise<ApiKeyRecord | null> {
  if (!key.startsWith(API_KEY_PREFIX)) return null;
  let q = supabaseAdmin.from("api_keys").select("id, user_id, feed_id, key_hash");
  if (feedId) q = q.eq("feed_id", feedId);
  const { data, error } = await q;
  if (error || !data) return null;
  for (const row of data as ApiKeyRecord[]) {
    if (await bcrypt.compare(key, row.key_hash)) {
      void supabaseAdmin
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", row.id);
      return row;
    }
  }
  return null;
}
