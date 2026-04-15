/*!
 * AIF Subscribe Widget
 * Drop-in: <script src="https://your-aif-backend/widget/aif-widget.js" async></script>
 *          <a href="aif://subscribe?url=https://example.com/aif.json"
 *             class="aif-subscribe-btn"
 *             data-theme="dark" data-size="md">Subscribe on AIF</a>
 *
 * The widget replaces any element with class `aif-subscribe-btn` with a styled button.
 * On click it dispatches an `aif:subscribe` custom event (which the AIF extension picks up);
 * if no extension is present, it opens the reader app in a new tab.
 */
(function () {
  if (window.__AIF_WIDGET_LOADED__) return;
  window.__AIF_WIDGET_LOADED__ = true;

  var READER_URL = (window.AIF_READER_URL || "https://reader.aif.dev").replace(/\/$/, "");

  var THEMES = {
    dark: { bg: "#6366f1", fg: "#ffffff", border: "#4f46e5" },
    light: { bg: "#eef2ff", fg: "#3730a3", border: "#c7d2fe" }
  };
  var SIZES = {
    sm: { pad: "4px 10px", font: "12px", icon: 12 },
    md: { pad: "8px 14px", font: "14px", icon: 14 },
    lg: { pad: "12px 20px", font: "16px", icon: 18 }
  };

  function logoSvg(px) {
    return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 16 16" aria-hidden="true" style="vertical-align:middle;margin-right:6px"><rect width="16" height="16" rx="3" fill="currentColor" opacity="0.2"/><text x="8" y="11" font-family="system-ui,Arial" font-size="7" font-weight="700" fill="currentColor" text-anchor="middle">AIF</text></svg>';
  }

  function parseHref(a) {
    var href = a.getAttribute("href") || "";
    var m = href.match(/url=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    return a.getAttribute("data-feed-url") || "";
  }

  function styleButton(btn, theme, size) {
    var t = THEMES[theme] || THEMES.dark;
    var s = SIZES[size] || SIZES.md;
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.gap = "6px";
    btn.style.padding = s.pad;
    btn.style.fontSize = s.font;
    btn.style.fontWeight = "600";
    btn.style.fontFamily = "system-ui,-apple-system,Arial,sans-serif";
    btn.style.background = t.bg;
    btn.style.color = t.fg;
    btn.style.border = "1px solid " + t.border;
    btn.style.borderRadius = "6px";
    btn.style.textDecoration = "none";
    btn.style.cursor = "pointer";
    btn.style.transition = "opacity .15s";
    btn.onmouseenter = function () { btn.style.opacity = "0.9"; };
    btn.onmouseleave = function () { btn.style.opacity = "1"; };
  }

  function attachTooltip(btn) {
    var tip;
    btn.addEventListener("mouseenter", function () {
      tip = document.createElement("div");
      tip.textContent = "What is AIF? The RSS for AI agents.";
      tip.style.cssText =
        "position:absolute;background:#0f0f13;color:#e2e8f0;padding:6px 10px;font-size:12px;border-radius:4px;white-space:nowrap;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,.3);pointer-events:none;";
      document.body.appendChild(tip);
      var r = btn.getBoundingClientRect();
      tip.style.top = window.scrollY + r.bottom + 6 + "px";
      tip.style.left = window.scrollX + r.left + "px";
    });
    btn.addEventListener("mouseleave", function () { if (tip) tip.remove(); });
  }

  function handleClick(feedUrl) {
    return function (e) {
      e.preventDefault();
      var handled = false;
      var ev = new CustomEvent("aif:subscribe", {
        detail: { url: feedUrl },
        bubbles: true,
      });
      window.addEventListener("aif:subscribe:handled", function onHandled() {
        handled = true;
        window.removeEventListener("aif:subscribe:handled", onHandled);
      });
      window.dispatchEvent(ev);
      setTimeout(function () {
        if (!handled) {
          window.open(READER_URL + "/subscribe?feed=" + encodeURIComponent(feedUrl), "_blank");
        }
      }, 80);
    };
  }

  function hydrate(el) {
    if (el.__aif_hydrated) return;
    el.__aif_hydrated = true;
    var feedUrl = parseHref(el);
    if (!feedUrl) return;
    var theme = el.getAttribute("data-theme") || "dark";
    var size = el.getAttribute("data-size") || "md";
    var size_ = SIZES[size] || SIZES.md;

    el.innerHTML = logoSvg(size_.icon) + "<span>" + (el.textContent.trim() || "Subscribe on AIF") + "</span>";
    styleButton(el, theme, size);
    attachTooltip(el);
    el.addEventListener("click", handleClick(feedUrl));
  }

  function hydrateAll() {
    var nodes = document.querySelectorAll(".aif-subscribe-btn");
    for (var i = 0; i < nodes.length; i++) hydrate(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrateAll);
  } else {
    hydrateAll();
  }

  var mo = new MutationObserver(hydrateAll);
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
