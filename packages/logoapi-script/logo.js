/*! logoapi-script loader. MIT. https://logoapi.sh
 * Usage: <script src="https://cdn.jsdelivr.net/npm/logoapi-script@VERSION/logo.js"></script>
 *        <span data-ticker="AAPL" data-size="48"></span>  (data-theme="dark" for the dark tile)
 * Each ticker is one plain script next to this file (t/AAPL.js, t/dark/AAPL.js) that pushes
 * the original SVG text from logoapi.sh. A ticker with no file shows a letter tile.
 */
(function () {
  "use strict";
  var w = window, d = document;
  if (w.LogoAPI && w.LogoAPI.scan) { w.LogoAPI.scan(); return; }

  var me = d.currentScript;
  if (!me) {
    var all = d.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) if (/\/logo\.js(\?|#|$)/.test(all[i].src)) { me = all[i]; break; }
  }
  var base = me && me.src ? me.src.replace(/logo\.js([?#].*)?$/, "") : "";
  var defTheme = me && me.getAttribute("data-theme") === "dark" ? "dark" : "light";
  var TIMEOUT = 8000;

  var store = {};   // key -> svg text
  var state = {};   // key -> "loading" | "ok" | "miss"
  var waiters = {}; // key -> [elements]
  var missed = {};  // key -> [elements] showing a tile; redrawn if the file arrives late

  function norm(s) {
    s = String(s == null ? "" : s).trim().toUpperCase();
    s = s.replace(/^[A-Z]+:/, "");   // NASDAQ:AAPL -> AAPL
    return s.replace(/[.\-\/]/g, ""); // BRK.B, BRK-B, BRK/B -> BRKB (same rule as logoapi.sh)
  }

  function tile(el, label, size, dark) {
    var t = d.createElement("span");
    var txt = (label || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
    t.textContent = txt;
    t.setAttribute("role", "img");
    t.setAttribute("aria-label", (label || "") + " logo");
    t.style.cssText = "display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;" +
      "width:" + size + "px;height:" + size + "px;border-radius:" + Math.round(size * 0.22) + "px;" +
      "font:600 " + Math.round(size * (txt.length > 1 ? 0.36 : 0.46)) + "px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
      (dark ? "background:#2a2f3a;color:#e6e8ee;" : "background:#e9ecf2;color:#3a4150;");
    put(el, t);
  }

  function put(el, node) {
    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(node);
  }

  // Inline fallback: the SVG goes into its own shadow root, so ids in one logo
  // never clash with another logo on the page. The SVG text is used as is.
  function inline(el, svg, label, size, dark) {
    try {
      var host = d.createElement("span");
      host.style.cssText = "display:inline-block;width:" + size + "px;height:" + size + "px;";
      host.setAttribute("role", "img");
      host.setAttribute("aria-label", label + " logo");
      var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
      root.innerHTML = "<style>svg{width:100%;height:100%;display:block}</style>" + svg;
      put(el, host);
    } catch (e) { tile(el, label, size, dark); }
  }

  function draw(el, key, label, size, dark) {
    var svg = store[key];
    var img = d.createElement("img");
    img.alt = label + " logo";
    img.width = size; img.height = size;
    img.style.cssText = "display:block;width:" + size + "px;height:" + size + "px;";
    img.onerror = function () { if (img.parentNode === el) inline(el, svg, label, size, dark); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    put(el, img);
  }

  function settle(key) {
    var list = waiters[key] || [];
    delete waiters[key];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.__logoapiKey !== key) continue; // attributes changed meanwhile
      var p = el.__logoapiArgs;
      if (state[key] === "ok") draw(el, key, p[0], p[1], p[2]);
      else { tile(el, p[0], p[1], p[2]); (missed[key] = missed[key] || []).push(el); }
    }
  }

  function inject(key) {
    state[key] = "loading";
    var s = d.createElement("script");
    var done = false;
    function miss() { if (done) return; done = true; if (state[key] !== "ok") { state[key] = "miss"; settle(key); } }
    s.async = true;
    s.src = base + key + ".js";
    s.onerror = miss;
    s.onload = function () { setTimeout(miss, 0); }; // loaded but pushed nothing: a miss
    setTimeout(miss, TIMEOUT);
    (d.head || d.documentElement).appendChild(s);
  }

  function want(el) {
    var raw = el.getAttribute("data-ticker") || "";
    var sym = norm(raw);
    var th = el.getAttribute("data-theme") || defTheme;
    var dark = th === "dark";
    var size = parseInt(el.getAttribute("data-size"), 10);
    if (!(size > 0 && size <= 1024)) size = 48;
    var ok = /^[A-Z0-9]{1,15}$/.test(sym);
    var key = ok ? (dark ? "t/dark/" : "t/") + sym : "";
    var sig = key + "|" + size + "|" + raw + "|" + dark;
    if (el.__logoapiSig === sig) return;
    el.__logoapiSig = sig;
    el.__logoapiKey = key;
    el.__logoapiArgs = [sym || raw, size, dark];
    if (el.style && !el.style.display) el.style.display = "inline-block";
    if (!ok || !base) { tile(el, sym || raw, size, dark); return; }
    if (state[key] === "ok") { draw(el, key, sym, size, dark); return; }
    if (state[key] === "miss") { tile(el, sym, size, dark); (missed[key] = missed[key] || []).push(el); return; }
    (waiters[key] = waiters[key] || []).push(el);
    if (!state[key]) inject(key);
  }

  function scan() {
    var els = d.querySelectorAll("[data-ticker]");
    for (var i = 0; i < els.length; i++) want(els[i]);
  }

  // Ticker files push [key, svg] here, in any load order.
  var Q = w.LOGOAPI_Q = w.LOGOAPI_Q || [];
  function take(item) {
    if (!item || typeof item[0] !== "string" || typeof item[1] !== "string") return;
    var key = item[0];
    store[key] = item[1];
    state[key] = "ok";
    if (missed[key]) { waiters[key] = (waiters[key] || []).concat(missed[key]); delete missed[key]; }
    settle(key);
  }
  for (var j = 0; j < Q.length; j++) take(Q[j]);
  Q.length = 0;
  Q.push = function () { for (var k = 0; k < arguments.length; k++) take(arguments[k]); return 0; };

  var queued = false;
  function later() { if (queued) return; queued = true; setTimeout(function () { queued = false; scan(); }, 0); }

  w.LogoAPI = { base: base, scan: scan, norm: norm };

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", scan);
  else scan();
  if (w.MutationObserver) {
    new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === "attributes" || r.addedNodes.length) { later(); return; }
      }
    }).observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ticker", "data-theme", "data-size"] });
  }
})();
