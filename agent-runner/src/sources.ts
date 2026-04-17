import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import type { AgentSource } from "./config";

const UA = "Mozilla/5.0 (compatible; AIF-Agent/1.0; +https://aif.dev)";
const rssParser = new Parser({
  headers: { "User-Agent": UA },
  timeout: 15_000,
});
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const MAX_SOURCE_CHARS = 12_000;
const MAX_TOTAL_CHARS = 40_000;

export interface SourceContent {
  label: string;
  text: string;
}

export async function gatherSources(sources: AgentSource[]): Promise<SourceContent[]> {
  const results: SourceContent[] = [];
  for (const s of sources) {
    try {
      const content = s.type === "rss" ? await fetchRss(s.url) : await fetchUrl(s.url);
      if (content.trim()) results.push({ label: s.url, text: content.slice(0, MAX_SOURCE_CHARS) });
    } catch (err) {
      console.warn(`[sources] failed to fetch ${s.url}:`, (err as Error).message);
    }
  }
  let total = 0;
  return results.filter((r) => {
    total += r.text.length;
    return total <= MAX_TOTAL_CHARS;
  });
}

async function fetchRss(url: string): Promise<string> {
  const feed = await rssParser.parseURL(url);
  const cutoff = Date.now() - SEVEN_DAYS;
  const items = (feed.items ?? []).filter((i) => {
    if (!i.isoDate) return true;
    return new Date(i.isoDate).getTime() >= cutoff;
  });
  return items
    .map((i) => `- ${i.title ?? ""} (${i.isoDate ?? ""})\n  ${i.contentSnippet ?? i.content ?? ""}`)
    .join("\n");
}

async function fetchUrl(url: string): Promise<string> {
  const res = await axios.get<string>(url, {
    timeout: 15_000,
    responseType: "text",
    headers: { "User-Agent": UA },
  });
  const $ = cheerio.load(res.data);
  $("script, style, nav, footer, header").remove();
  const text = $("main").text() || $("body").text();
  return text.replace(/\s+/g, " ").trim().slice(0, 8000);
}
