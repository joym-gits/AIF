import type { DetectedFeed, StoredFeed, CachedItem, Settings, Message } from "./types";
import { DEFAULT_BACKEND } from "./types";

const detectedByTab = new Map<number, DetectedFeed[]>();

async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.sync.get("settings");
  return settings ?? { backend_url: DEFAULT_BACKEND };
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "complete" && tab.url?.startsWith("http")) {
    chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" } satisfies Message).catch(() => {
      // content script not yet loaded — safe to ignore
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  detectedByTab.delete(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ installed_at: Date.now() });
});

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  if (msg.type === "OPEN_POPUP") {
    (chrome.action as unknown as { openPopup?: () => void }).openPopup?.();
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "AIF_DETECTED" && sender.tab?.id != null) {
    const tabId = sender.tab.id;
    detectedByTab.set(tabId, msg.feeds);
    const count = msg.feeds.length;
    chrome.action.setBadgeBackgroundColor({ color: "#6366f1", tabId });
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "", tabId });
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "GET_DETECTED") {
    sendResponse({ feeds: detectedByTab.get(msg.tabId) ?? [] });
    return true;
  }
  if (msg.type === "REFRESH_SUBSCRIPTIONS") {
    refreshAll().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

chrome.alarms.create("aif-refresh", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "aif-refresh") void refreshAll();
});

async function refreshAll(): Promise<void> {
  const { subscriptions } = (await chrome.storage.sync.get("subscriptions")) as {
    subscriptions?: StoredFeed[];
  };
  if (!subscriptions || subscriptions.length === 0) return;
  const settings = await getSettings();
  for (const feed of subscriptions) {
    try {
      const res = await fetch(`${settings.backend_url}/api/v1/feeds/${feed.id}/items?page=1&page_size=5`);
      if (!res.ok) continue;
      const body = (await res.json()) as { items: CachedItem[] };
      await chrome.storage.local.set({ [`items:${feed.id}`]: body.items });
    } catch (err) {
      console.warn("[aif] refresh failed for", feed.id, err);
    }
  }
}
