import type { CachedItem, DetectedFeed, Settings, StoredFeed, Message } from "./types";
import { DEFAULT_BACKEND } from "./types";

const DOMAIN_COLORS: Record<string, string> = {
  healthcare: "bg-emerald-600/30 text-emerald-300",
  finance: "bg-blue-600/30 text-blue-300",
  legal: "bg-amber-600/30 text-amber-300",
  research: "bg-purple-600/30 text-purple-300",
  tech: "bg-sky-600/30 text-sky-300",
  general: "bg-slate-600/40 text-slate-200",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function domainBadge(d?: string): string {
  if (!d) return "";
  const cls = DOMAIN_COLORS[d] ?? DOMAIN_COLORS.general;
  return `<span class="px-2 py-0.5 rounded-full text-xs ${cls}">${escapeHtml(d)}</span>`;
}

function cadenceBadge(c?: string): string {
  if (!c) return "";
  return `<span class="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-200">${escapeHtml(c)}</span>`;
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.sync.get("settings");
  return settings ?? { backend_url: DEFAULT_BACKEND };
}

async function setSettings(s: Settings): Promise<void> {
  await chrome.storage.sync.set({ settings: s });
}

async function getSubscriptions(): Promise<StoredFeed[]> {
  const { subscriptions } = await chrome.storage.sync.get("subscriptions");
  return subscriptions ?? [];
}

async function saveSubscriptions(subs: StoredFeed[]): Promise<void> {
  await chrome.storage.sync.set({ subscriptions: subs });
}

async function getCachedItems(feedId: string): Promise<CachedItem[]> {
  const key = `items:${feedId}`;
  const obj = await chrome.storage.local.get(key);
  return obj[key] ?? [];
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const settings = await getSettings();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.jwt) headers.Authorization = `Bearer ${settings.jwt}`;
  Object.assign(headers, init.headers as Record<string, string> | undefined);
  const res = await fetch(`${settings.backend_url}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

function setActiveTab(name: string): void {
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("border-brand", on);
    b.classList.toggle("text-white", on);
    b.classList.toggle("border-transparent", !on);
    b.classList.toggle("text-slate-400", !on);
  });
  document.querySelectorAll<HTMLElement>(".pane").forEach((p) => {
    p.classList.toggle("hidden", p.dataset.pane !== name);
  });
}

async function renderPage(): Promise<void> {
  const pane = document.querySelector<HTMLElement>('[data-pane="page"]')!;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    pane.innerHTML = `<p class="text-slate-500">No active tab.</p>`;
    return;
  }
  const { feeds } = (await chrome.runtime.sendMessage({
    type: "GET_DETECTED",
    tabId: tab.id,
  } satisfies Message)) as { feeds: DetectedFeed[] };

  if (!feeds || feeds.length === 0) {
    pane.innerHTML = `<p class="text-slate-500 text-center py-8">No AIF feeds found on this page.</p>`;
    return;
  }

  pane.innerHTML = feeds
    .map(
      (f, i) => `
    <div class="rounded border border-slate-800 bg-slate-800/40 p-3 mb-2">
      <div class="font-medium">${escapeHtml(f.title)}</div>
      <div class="text-xs text-slate-500 break-all">${escapeHtml(f.href)}</div>
      <button data-sub-idx="${i}" class="mt-2 px-3 py-1 rounded bg-brand text-white text-xs hover:opacity-90">Subscribe</button>
    </div>`,
    )
    .join("");

  pane.querySelectorAll<HTMLButtonElement>("button[data-sub-idx]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.subIdx);
      const f = feeds[idx];
      btn.disabled = true;
      btn.textContent = "Subscribing…";
      try {
        const reg = await api<{ id: string; feed: { title: string; description?: string; domain?: string; cadence?: string } }>(
          "/api/v1/feeds",
          { method: "POST", body: JSON.stringify({ feed_url: f.href }) },
        );
        await api(`/api/v1/feeds/${reg.id}/subscribe`, { method: "POST" });
        const subs = await getSubscriptions();
        subs.push({
          id: reg.id,
          title: reg.feed.title,
          description: reg.feed.description,
          domain: reg.feed.domain,
          cadence: reg.feed.cadence,
          feed_url: f.href,
          subscribed_at: new Date().toISOString(),
        });
        await saveSubscriptions(subs);
        btn.textContent = "Subscribed ✓";
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Retry";
        console.error(err);
      }
    });
  });
}

async function renderMine(): Promise<void> {
  const pane = document.querySelector<HTMLElement>('[data-pane="mine"]')!;
  const subs = await getSubscriptions();
  if (subs.length === 0) {
    pane.innerHTML = `<p class="text-slate-500 text-center py-8">No subscriptions yet.</p>`;
    return;
  }
  const settings = await getSettings();
  const cards = await Promise.all(
    subs.map(async (s) => {
      const items = await getCachedItems(s.id);
      const latest = items[0];
      const latestHtml = latest
        ? `
        <div class="mt-2 border-t border-slate-800 pt-2">
          <div class="text-xs text-slate-400">${relativeTime(latest.published_at)}</div>
          <div class="text-sm font-medium">${escapeHtml(latest.title)}</div>
          <div class="text-xs text-slate-400">${escapeHtml(latest.summary)}</div>
        </div>`
        : `<div class="mt-2 text-xs text-slate-500">No cached items yet.</div>`;

      return `
      <div class="rounded border border-slate-800 bg-slate-800/40 p-3 mb-2" data-feed-id="${s.id}">
        <div class="flex items-center gap-2">
          <div class="font-medium flex-1">${escapeHtml(s.title)}</div>
          ${domainBadge(s.domain)} ${cadenceBadge(s.cadence)}
        </div>
        ${latestHtml}
        <div class="mt-3 flex flex-wrap gap-2">
          <button data-act="inject" class="px-2 py-1 rounded bg-brand text-white text-xs" ${latest ? "" : "disabled"}>Inject into AI</button>
          <a data-act="open" href="${settings.backend_url.replace(/\/api.*/, "")}/feed/${s.id}" target="_blank"
             class="px-2 py-1 rounded border border-slate-700 text-xs text-slate-200">Open in Reader</a>
          <button data-act="unsub" class="px-2 py-1 rounded border border-rose-900 text-rose-300 text-xs ml-auto">Unsubscribe</button>
        </div>
      </div>`;
    }),
  );
  pane.innerHTML = cards.join("");

  pane.querySelectorAll<HTMLElement>("[data-feed-id]").forEach((card) => {
    const feedId = card.dataset.feedId!;
    card.querySelector<HTMLButtonElement>('[data-act="inject"]')?.addEventListener("click", async () => {
      const items = await getCachedItems(feedId);
      if (!items[0]) return;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const feed = subs.find((f) => f.id === feedId)!;
      const resp = (await chrome.tabs.sendMessage(tab.id, {
        type: "INJECT_CONTEXT",
        feedTitle: feed.title,
        item: items[0],
      } satisfies Message)) as { ok: boolean };
      const btn = card.querySelector<HTMLButtonElement>('[data-act="inject"]')!;
      btn.textContent = resp?.ok ? "Injected ✓" : "No target found";
    });
    card.querySelector<HTMLButtonElement>('[data-act="unsub"]')?.addEventListener("click", async () => {
      try {
        await api(`/api/v1/feeds/${feedId}/subscribe`, { method: "DELETE" });
      } catch {
        // still remove locally even if backend call fails
      }
      const next = (await getSubscriptions()).filter((s) => s.id !== feedId);
      await saveSubscriptions(next);
      await renderMine();
    });
  });
}

function renderDiscover(): void {
  const input = document.getElementById("search") as HTMLInputElement;
  const results = document.getElementById("search-results")!;
  let t: number | undefined;
  input.addEventListener("input", () => {
    window.clearTimeout(t);
    t = window.setTimeout(async () => {
      const q = input.value.trim();
      if (!q) {
        results.innerHTML = "";
        return;
      }
      try {
        const { feeds } = await api<{ feeds: StoredFeed[] }>(
          `/api/v1/feeds?search=${encodeURIComponent(q)}&sort=popular`,
        );
        results.innerHTML = feeds
          .map(
            (f) => `
          <div class="rounded border border-slate-800 bg-slate-800/40 p-3">
            <div class="flex items-center gap-2">
              <div class="font-medium flex-1">${escapeHtml(f.title)}</div>
              ${domainBadge(f.domain)}
            </div>
            <div class="text-xs text-slate-400 mt-1">${f.subscriber_count ?? 0} subscribers</div>
            <button data-sub-id="${f.id}" data-url="${escapeHtml(f.feed_url)}"
                    class="mt-2 px-3 py-1 rounded bg-brand text-white text-xs">Subscribe</button>
          </div>`,
          )
          .join("");

        results.querySelectorAll<HTMLButtonElement>("button[data-sub-id]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const id = btn.dataset.subId!;
            btn.disabled = true;
            btn.textContent = "Subscribing…";
            try {
              await api(`/api/v1/feeds/${id}/subscribe`, { method: "POST" });
              const subs = await getSubscriptions();
              if (!subs.find((s) => s.id === id)) {
                const match = feeds.find((x) => x.id === id)!;
                subs.push({
                  id,
                  title: match.title,
                  description: match.description,
                  domain: match.domain,
                  cadence: match.cadence,
                  feed_url: match.feed_url,
                  subscribed_at: new Date().toISOString(),
                });
                await saveSubscriptions(subs);
              }
              btn.textContent = "Subscribed ✓";
            } catch {
              btn.disabled = false;
              btn.textContent = "Retry";
            }
          });
        });
      } catch (err) {
        results.innerHTML = `<p class="text-rose-400 text-xs">${escapeHtml(String(err))}</p>`;
      }
    }, 300);
  });
}

async function renderSettings(): Promise<void> {
  const pane = document.querySelector<HTMLElement>('[data-pane="settings"]')!;
  const s = await getSettings();
  const loggedIn = Boolean(s.jwt);
  pane.innerHTML = `
    <div class="space-y-3">
      <label class="block">
        <span class="text-xs text-slate-400">Backend URL</span>
        <input id="cfg-url" class="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm"
               value="${escapeHtml(s.backend_url)}" />
      </label>
      <div class="border-t border-slate-800 pt-3">
        ${
          loggedIn
            ? `<div class="text-sm">Logged in as <span class="text-brand font-medium">${escapeHtml(s.username ?? s.email ?? "(user)")}</span></div>
               <button id="btn-logout" class="mt-2 px-3 py-1 rounded border border-slate-700 text-xs">Log out</button>`
            : `<div class="space-y-2">
                 <input id="cfg-email" type="email" placeholder="Email"
                        class="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm" />
                 <input id="cfg-password" type="password" placeholder="Password"
                        class="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm" />
                 <button id="btn-login" class="w-full py-1 rounded bg-brand text-white text-sm">Log in</button>
                 <p id="login-err" class="text-rose-400 text-xs hidden"></p>
               </div>`
        }
      </div>
      <button id="btn-save-url" class="w-full py-1 rounded border border-slate-700 text-xs">Save backend URL</button>
    </div>`;

  document.getElementById("btn-save-url")?.addEventListener("click", async () => {
    const url = (document.getElementById("cfg-url") as HTMLInputElement).value.trim();
    await setSettings({ ...s, backend_url: url });
  });
  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await setSettings({ backend_url: s.backend_url });
    await renderSettings();
  });
  document.getElementById("btn-login")?.addEventListener("click", async () => {
    const email = (document.getElementById("cfg-email") as HTMLInputElement).value.trim();
    const password = (document.getElementById("cfg-password") as HTMLInputElement).value;
    const err = document.getElementById("login-err")!;
    try {
      const url = (document.getElementById("cfg-url") as HTMLInputElement).value.trim();
      const res = await fetch(`${url}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const body = (await res.json()) as { access_token: string; user: { email?: string } };
      await setSettings({
        backend_url: url,
        jwt: body.access_token,
        email: body.user.email,
        username: body.user.email,
      });
      await renderSettings();
    } catch (e) {
      err.textContent = String(e);
      err.classList.remove("hidden");
    }
  });
}

document.getElementById("tabs")!.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button.tab");
  if (!btn) return;
  const name = btn.dataset.tab!;
  setActiveTab(name);
  if (name === "page") void renderPage();
  if (name === "mine") void renderMine();
});

document.getElementById("btn-settings")!.addEventListener("click", () => {
  setActiveTab("settings");
  void renderSettings();
});

void renderPage();
void renderMine();
renderDiscover();
