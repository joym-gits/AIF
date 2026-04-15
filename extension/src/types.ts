export interface DetectedFeed {
  title: string;
  href: string;
  page: string;
}

export interface StoredFeed {
  id: string;
  title: string;
  description?: string;
  domain?: string;
  cadence?: string;
  feed_url: string;
  subscriber_count?: number;
  subscribed_at: string;
}

export interface CachedItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  confidence?: number;
  signals?: string[];
  published_at: string;
}

export interface Settings {
  backend_url: string;
  jwt?: string;
  username?: string;
  email?: string;
}

export type Message =
  | { type: "SCAN_PAGE" }
  | { type: "AIF_DETECTED"; feeds: DetectedFeed[] }
  | { type: "GET_DETECTED"; tabId: number }
  | { type: "INJECT_CONTEXT"; feedTitle: string; item: CachedItem }
  | { type: "REFRESH_SUBSCRIPTIONS" }
  | { type: "OPEN_POPUP" };

export const DEFAULT_BACKEND = "https://api.your-aif-backend.com";
