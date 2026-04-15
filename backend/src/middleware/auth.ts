import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabase";
import { API_KEY_PREFIX, verifyApiKey } from "../lib/apiKeys";

export interface AuthedRequest extends Request {
  user?: { id: string; email?: string };
  jwt?: string;
  apiKey?: { id: string; feed_id: string };
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const token = header.slice("Bearer ".length);

  if (token.startsWith(API_KEY_PREFIX)) {
    const feedId = typeof req.params.id === "string" ? req.params.id : undefined;
    const rec = await verifyApiKey(token, feedId);
    if (!rec) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }
    if (feedId && rec.feed_id !== feedId) {
      res.status(403).json({ error: "API key not valid for this feed" });
      return;
    }
    req.user = { id: rec.user_id };
    req.apiKey = { id: rec.id, feed_id: rec.feed_id };
    next();
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.user = { id: data.user.id, email: data.user.email ?? undefined };
  req.jwt = token;
  next();
}
