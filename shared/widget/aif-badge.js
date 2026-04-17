/*!
 * AIF "Powered by" Badge
 * Drop-in: <div class="aif-badge" data-feed-url="https://example.com/aif.json"></div>
 *          <script src="https://your-backend/widget/aif-badge.js" async></script>
 *
 * Options via data attributes:
 *   data-feed-url   — link to the feed's aif.json (opens reader on click)
 *   data-theme      — "dark" (default) or "light"
 *   data-size       — "sm", "md" (default), or "lg"
 *   data-style      — "full" (default), "compact", or "icon"
 */
(function () {
  if (window.__AIF_BADGE_LOADED__) return;
  window.__AIF_BADGE_LOADED__ = true;

  var READER = (window.AIF_READER_URL || "https://aif-reader.web.app").replace(/\/$/, "");

  var SIZES = {
    sm: { h: 24, font: 10, logo: 8, pad: "3px 8px", gap: 4, iconSize: 24 },
    md: { h: 30, font: 12, logo: 10, pad: "4px 10px", gap: 6, iconSize: 30 },
    lg: { h: 36, font: 14, logo: 12, pad: "6px 14px", gap: 8, iconSize: 36 },
  };

  var THEMES = {
    dark: { bg: "#1a1a24", border: "#2a2a3a", text: "#94a3b8", accent: "#6366f1", logoText: "#ffffff" },
    light: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b", accent: "#6366f1", logoText: "#ffffff" },
  };

  function buildSvgLogo(size, color) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;flex-shrink:0">' +
      '<rect width="20" height="20" rx="4" fill="' + color + '"/>' +
      '<text x="10" y="13.5" font-family="system-ui,Arial,sans-serif" font-size="8" font-weight="800" fill="white" text-anchor="middle">AIF</text>' +
      '</svg>';
  }

  function hydrate(el) {
    if (el.__aif_badge_done) return;
    el.__aif_badge_done = true;

    var feedUrl = el.getAttribute("data-feed-url") || "";
    var theme = THEMES[el.getAttribute("data-theme")] || THEMES.dark;
    var size = SIZES[el.getAttribute("data-size")] || SIZES.md;
    var style = el.getAttribute("data-style") || "full";

    var href = feedUrl
      ? READER + "/subscribe?feed=" + encodeURIComponent(feedUrl)
      : READER;

    var a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = "AI Intelligence Feed — subscribe for AI-curated intelligence";
    a.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "gap:" + size.gap + "px",
      "padding:" + size.pad,
      "background:" + theme.bg,
      "border:1px solid " + theme.border,
      "border-radius:6px",
      "text-decoration:none",
      "font-family:system-ui,-apple-system,Arial,sans-serif",
      "transition:border-color .15s,box-shadow .15s",
      "cursor:pointer",
    ].join(";");
    a.onmouseenter = function () {
      a.style.borderColor = theme.accent;
      a.style.boxShadow = "0 0 0 1px " + theme.accent + "40";
    };
    a.onmouseleave = function () {
      a.style.borderColor = theme.border;
      a.style.boxShadow = "none";
    };

    if (style === "icon") {
      a.innerHTML = buildSvgLogo(size.iconSize, theme.accent);
      a.style.padding = "0";
      a.style.border = "none";
      a.style.background = "transparent";
    } else if (style === "compact") {
      a.innerHTML =
        buildSvgLogo(size.h - 8, theme.accent) +
        '<span style="font-size:' + size.font + 'px;font-weight:600;color:' + theme.text + '">AIF</span>';
    } else {
      a.innerHTML =
        buildSvgLogo(size.h - 8, theme.accent) +
        '<span style="font-size:' + size.font + 'px;color:' + theme.text + '">' +
        '<span style="font-weight:600;color:' + theme.accent + '">Powered by AIF</span>' +
        '<span style="margin-left:4px;opacity:0.6">· AI Intelligence Feed</span>' +
        '</span>';
    }

    el.innerHTML = "";
    el.appendChild(a);
  }

  function hydrateAll() {
    var els = document.querySelectorAll(".aif-badge");
    for (var i = 0; i < els.length; i++) hydrate(els[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }

  new MutationObserver(hydrateAll).observe(document.documentElement, { childList: true, subtree: true });
})();
