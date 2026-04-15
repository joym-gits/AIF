import type { CachedItem, DetectedFeed, Message } from "./types";

const AI_HOSTS = ["claude.ai", "chatgpt.com", "gemini.google.com", "chat.mistral.ai"];

function scan(): DetectedFeed[] {
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="alternate"][type="application/aif+json"]',
  );
  return Array.from(links).map((l) => ({
    title: l.title || l.href,
    href: l.href,
    page: location.href,
  }));
}

function reportFeeds(): DetectedFeed[] {
  const feeds = scan();
  chrome.runtime
    .sendMessage({ type: "AIF_DETECTED", feeds } satisfies Message)
    .catch(() => undefined);
  return feeds;
}

function markExtensionPresent(): void {
  const marker = document.createElement("meta");
  marker.name = "aif-extension";
  marker.content = "installed";
  document.head?.appendChild(marker);
  // Also expose via a window property readable from page scripts
  const script = document.createElement("script");
  script.textContent = "window.__AIF_EXTENSION__ = true;";
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function attachSubscribeBridge(): void {
  window.addEventListener("aif:subscribe", (e) => {
    const detail = (e as CustomEvent<{ url?: string }>).detail;
    if (!detail?.url) return;
    chrome.runtime.sendMessage({
      type: "AIF_DETECTED",
      feeds: [{ title: detail.url, href: detail.url, page: location.href }],
    } satisfies Message);
    window.dispatchEvent(new CustomEvent("aif:subscribe:handled"));
  });
}

function maybeShowAiPlatformPill(count: number): void {
  const host = location.hostname;
  if (!AI_HOSTS.some((h) => host.endsWith(h))) return;
  const existing = document.getElementById("aif-ai-pill");
  if (existing) existing.remove();
  if (count === 0) return;

  const pill = document.createElement("div");
  pill.id = "aif-ai-pill";
  pill.textContent = `${count} AIF feed${count === 1 ? "" : "s"} detected`;
  pill.style.cssText = [
    "position:fixed",
    "bottom:20px",
    "right:20px",
    "z-index:2147483647",
    "background:#6366f1",
    "color:#ffffff",
    "padding:8px 14px",
    "border-radius:999px",
    "font:600 12px system-ui,-apple-system,Arial,sans-serif",
    "box-shadow:0 6px 20px rgba(99,102,241,.35)",
    "cursor:pointer",
    "display:inline-flex",
    "align-items:center",
    "gap:6px",
  ].join(";");
  pill.innerHTML =
    '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:rgba(255,255,255,.2);font:700 8px/16px system-ui;text-align:center">AIF</span>' +
    pill.textContent;
  pill.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "AIF_DETECTED", feeds: scan() } satisfies Message);
    chrome.runtime.sendMessage({ type: "OPEN_POPUP" }).catch(() => undefined);
  });
  document.body.appendChild(pill);
}

function reportAndDecorate(): void {
  const feeds = reportFeeds();
  maybeShowAiPlatformPill(feeds.length);
}

markExtensionPresent();
attachSubscribeBridge();
reportAndDecorate();

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === "SCAN_PAGE") {
    reportAndDecorate();
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "INJECT_CONTEXT") {
    const ok = injectContext(msg.feedTitle, msg.item);
    sendResponse({ ok });
    return true;
  }
  return false;
});

function buildContextBlock(feedTitle: string, item: CachedItem): string {
  const date = new Date(item.published_at).toISOString().slice(0, 10);
  const signals = (item.signals ?? []).join(", ");
  const confidence = item.confidence != null ? item.confidence.toFixed(2) : "n/a";
  return [
    `[AIF CONTEXT — ${feedTitle} — ${date}]`,
    item.summary,
    `Signals: ${signals}`,
    `Confidence: ${confidence}`,
    `[END AIF CONTEXT]`,
    "",
  ].join("\n");
}

function injectContext(feedTitle: string, item: CachedItem): boolean {
  const block = buildContextBlock(feedTitle, item);
  const host = location.hostname;
  if (host.endsWith("claude.ai")) {
    const el =
      document.querySelector<HTMLElement>('[data-testid="chat-input"]') ??
      document.querySelector<HTMLElement>('div[contenteditable="true"]');
    return prependToEditable(el, block);
  }
  if (host.endsWith("chatgpt.com")) {
    const el = document.getElementById("prompt-textarea");
    return prependToEditable(el, block);
  }
  if (host.endsWith("gemini.google.com")) {
    const el = document.querySelector<HTMLElement>(".ql-editor");
    return prependToEditable(el, block);
  }
  if (host.endsWith("chat.mistral.ai")) {
    const el =
      document.querySelector<HTMLTextAreaElement>("textarea") ??
      document.querySelector<HTMLElement>('div[contenteditable="true"]');
    return prependToEditable(el, block);
  }
  return false;
}

function prependToEditable(el: HTMLElement | null, text: string): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = text + el.value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    el.focus();
    el.innerText = text + el.innerText;
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }
  return true;
}
