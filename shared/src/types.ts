export type AIFDomain =
  | "healthcare"
  | "finance"
  | "legal"
  | "research"
  | "tech"
  | "general";

export type AIFCadence = "realtime" | "daily" | "weekly" | "monthly";

export interface AIFAuthor {
  name: string;
  did?: string;
  verified: boolean;
}

export interface AIFItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  confidence: number;
  signals: string[];
  source_urls: string[];
  agent_model: string;
  published_at: string;
  tags: string[];
}

export interface AIFFeed {
  aif: "1.0";
  id: string;
  title: string;
  description: string;
  author: AIFAuthor;
  domain: AIFDomain;
  cadence: AIFCadence;
  language: string;
  feed_url: string;
  hub_url?: string;
  created_at: string;
  updated_at: string;
  items: AIFItem[];
}
