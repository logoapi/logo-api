// Offline tests: file format, byte fidelity, loader behavior in a small fake DOM.
// If t/ was built, every file is also checked against t/sha256.json.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

let failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const LOADER = fs.readFileSync(path.join(__dirname, "logo.js"), "utf8");
const BASE = "https://cdn.jsdelivr.net/npm/logoapi-script@0.1.0/";

// ---- tiny fake DOM, just what logo.js touches ----
function fakeDom(files, display) {
  const timers = [];
  const injected = [];
  class El {
    constructor(tag) { this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attrs = {}; this.children = []; this.style = { cssText: "" }; this.parentNode = null; }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    get childNodes() { return this.children; }
    get firstChild() { return this.children[0] || null; }
    appendChild(c) { c.parentNode = this; this.children.push(c); if (c.tagName === "SCRIPT") injected.push(c); return c; }
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); c.parentNode = null; return c; }
    attachShadow() { this.shadow = { innerHTML: "" }; return this.shadow; }
  }
  const body = new El("body");
  const head = new El("head");
  const doc = {
    readyState: "complete", head, body, documentElement: new El("html"),
    currentScript: Object.assign(new El("script"), { src: BASE + "logo.js" }),
    createElement: (t) => new El(t),
    getElementsByTagName: () => [],
    querySelectorAll: () => body.children.filter((e) => e.getAttribute("data-ticker") !== null || e.getAttribute("data-logoapi") !== null),
    addEventListener() {},
  };
  const win = { getComputedStyle: (e) => ({ display: (display && display(e)) || "inline" }), document: doc, setTimeout: (f) => { timers.push(f); return timers.length; }, encodeURIComponent, parseInt, Math, String, RegExp };
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  function run() { // play script loads and timers until quiet
    for (let n = 0; n < 50 && (injected.length || timers.length); n++) {
      while (injected.length) {
        const s = injected.shift();
        const rel = s.src.slice(BASE.length);
        if (files[rel] !== undefined) { vm.runInContext(files[rel], ctx); s.onload && s.onload(); }
        else s.onerror && s.onerror();
      }
      const t = timers.splice(0); t.forEach((f) => f());
    }
  }
  const span = (attrs) => { const e = new El("span"); Object.assign(e.attrs, attrs); body.appendChild(e); return e; };
  return { ctx, run, span, head, injectedLog: () => head.children.map((s) => s.src), load: () => vm.runInContext(LOADER, ctx) };
}

const { toScript, exactText, norm } = (() => {
  // build.mjs is ESM; re-declare its pure helpers by evaluating the same source text.
  const src = fs.readFileSync(path.join(__dirname, "scripts", "build.mjs"), "utf8");
  const pick = (name) => src.match(new RegExp("export (?:const " + name + " = [^\\n]+|function " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n\\})"))[0].replace(/^export /, "");
  return vm.runInNewContext("(" + "() => {" + pick("norm") + ";" + pick("toScript") + ";" + pick("exactText") + "; return { norm, toScript, exactText }; })()", { TextDecoder, Buffer, JSON });
})();

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>Société  "q" </title><rect id="a" width="64" height="64"/></svg>';
const valueOf = (file) => { const box = { self: {} }; vm.runInNewContext(file, box); return box.self.LOGOAPI_Q[0]; };

test("toScript is ASCII, one statement, value equals the SVG text", () => {
  const f = toScript("t/AAPL", SVG);
  assert.ok(/^[\x00-\x7e]*$/.test(f), "non-ASCII in file");
  assert.ok(!/\b(module|require|exports|import)\b/.test(f));
  const [k, v] = valueOf(f);
  assert.equal(k, "t/AAPL");
  assert.equal(v, SVG);
});

test("exactText round-trips bytes and rejects bad UTF-8", () => {
  const buf = Buffer.from(SVG, "utf8");
  assert.equal(exactText(new Uint8Array(buf)), SVG);
  assert.throws(() => exactText(new Uint8Array([0x3c, 0xff, 0x3e])));
});

test("norm matches logoapi.sh symbol rule", () => {
  for (const [a, b] of [["brk.b", "BRKB"], ["BRK-B", "BRKB"], ["BRK/B", "BRKB"], ["nasdaq:aapl", "AAPL"], [" msft ", "MSFT"]]) assert.equal(norm(a), b);
});

test("loader renders a hit as a data: img with the SVG bytes", () => {
  const dom = fakeDom({ "t/AAPL.js": toScript("t/AAPL", SVG) });
  const el = dom.span({ "data-ticker": "aapl", "data-size": "32" });
  dom.load(); dom.run();
  const img = el.children[0];
  assert.equal(img.tagName, "IMG");
  assert.equal(img.width, 32);
  assert.equal(decodeURIComponent(img.src.replace("data:image/svg+xml;charset=utf-8,", "")), SVG);
  assert.deepEqual(dom.injectedLog(), [BASE + "t/AAPL.js"]);
});

test("img error falls back to the SVG in a shadow root", () => {
  const dom = fakeDom({ "t/AAPL.js": toScript("t/AAPL", SVG) });
  const el = dom.span({ "data-ticker": "AAPL" });
  dom.load(); dom.run();
  el.children[0].onerror();
  const host = el.children[0];
  assert.equal(host.tagName, "SPAN");
  assert.ok(host.shadow.innerHTML.endsWith(SVG));
});

test("miss shows a letter tile, never another source", () => {
  const dom = fakeDom({});
  const el = dom.span({ "data-ticker": "ZZZQ" });
  dom.load(); dom.run();
  const t = el.children[0];
  assert.equal(t.tagName, "SPAN");
  assert.equal(t.textContent, "ZZ");
  assert.equal(t.getAttribute("role"), "img");
  assert.ok(!/url\(|http/.test(t.style.cssText));
});

test("bad symbol shows a tile and loads nothing", () => {
  const dom = fakeDom({});
  const el = dom.span({ "data-ticker": "<x>" });
  dom.load(); dom.run();
  assert.equal(el.children[0].textContent, "X");
  assert.deepEqual(dom.injectedLog(), []);
});

test("dark path, dedupe, same version as the loader", () => {
  const dom = fakeDom({ "t/dark/NVDA.js": toScript("t/dark/NVDA", SVG) });
  const a = dom.span({ "data-ticker": "NVDA", "data-theme": "dark" });
  const b = dom.span({ "data-ticker": "nvda", "data-theme": "dark" });
  dom.load(); dom.run();
  assert.deepEqual(dom.injectedLog(), [BASE + "t/dark/NVDA.js"]);
  assert.equal(a.children[0].tagName, "IMG");
  assert.equal(b.children[0].tagName, "IMG");
});

test("nodes added later and changed attributes are picked up by scan", () => {
  const dom = fakeDom({ "t/AAPL.js": toScript("t/AAPL", SVG), "t/MSFT.js": toScript("t/MSFT", SVG) });
  dom.load(); dom.run();
  const el = dom.span({ "data-ticker": "AAPL" });
  dom.ctx.LogoAPI.scan(); dom.run();
  assert.equal(el.children[0].tagName, "IMG");
  el.setAttribute("data-ticker", "MSFT");
  dom.ctx.LogoAPI.scan(); dom.run();
  assert.equal(dom.injectedLog().length, 2);
  assert.match(el.children[0].alt, /MSFT/);
});

test("a file that pushes after the timeout replaces the tile", () => {
  const dom = fakeDom({}); // script errors or times out first
  const el = dom.span({ "data-ticker": "AAPL" });
  dom.load(); dom.run();
  assert.equal(el.children[0].textContent, "AA");
  vm.runInContext(toScript("t/AAPL", SVG), dom.ctx); // late push
  assert.equal(el.children[0].tagName, "IMG");
});

test("theme change on a tile redraws the tile", () => {
  const dom = fakeDom({});
  const el = dom.span({ "data-ticker": "<x>" });
  dom.load(); dom.run();
  assert.match(el.children[0].style.cssText, /#e9ecf2/);
  el.setAttribute("data-theme", "dark");
  dom.ctx.LogoAPI.scan(); dom.run();
  assert.match(el.children[0].style.cssText, /#2a2f3a/);
});

test("host: plain inline span becomes a centred inline-flex box", () => {
  const dom = fakeDom({ "t/AAPL.js": toScript("t/AAPL", SVG) });
  const el = dom.span({ "data-ticker": "AAPL" });
  dom.load(); dom.run();
  assert.equal(el.style.display, "inline-flex");
  assert.equal(el.style.alignItems, "center");
  assert.equal(el.style.justifyContent, "center");
  assert.equal(el.style.verticalAlign, "middle");
  assert.match(el.children[0].style.cssText, /width:48px;height:auto;aspect-ratio:1\/1/);
});

test("host: page CSS display (grid) and inline display are left alone, also later", () => {
  const dom = fakeDom({ "t/AAPL.js": toScript("t/AAPL", SVG) }, (e) => e.attrs.class === "g" ? "grid" : null);
  const a = dom.span({ "data-ticker": "AAPL", class: "g" });
  const b = dom.span({ "data-ticker": "AAPL" }); b.style.display = "block";
  dom.load(); dom.run();
  const c = dom.span({ "data-ticker": "AAPL", "data-theme": "dark", class: "g" });
  dom.ctx.LogoAPI.scan(); dom.run();
  assert.equal(a.style.display, undefined);
  assert.equal(b.style.display, "block");
  assert.equal(c.style.display, undefined);
});

test("element with page content is never filled, rechecked once empty", () => {
  const dom = fakeDom({ "t/AAPL.js": toScript("t/AAPL", SVG) });
  const row = dom.span({ "data-ticker": "AAPL" });
  const name = row.appendChild(new (Object.getPrototypeOf(row).constructor)("b"));
  const txt = dom.span({ "data-ticker": "AAPL" }); txt.children.push({ nodeType: 3, nodeValue: " Apple " });
  const ws = dom.span({ "data-ticker": "AAPL" }); ws.children.push({ nodeType: 3, nodeValue: " \n " });
  dom.load(); dom.run();
  assert.deepEqual(row.children, [name]);
  assert.equal(txt.children[0].nodeValue, " Apple ");
  assert.equal(ws.children[0].tagName, "IMG");
  row.removeChild(name);
  dom.ctx.LogoAPI.scan(); dom.run();
  assert.equal(row.children[0].tagName, "IMG");
});

test("data-logoapi works like data-ticker and wins over it", () => {
  const dom = fakeDom({ "t/MSFT.js": toScript("t/MSFT", SVG) });
  const el = dom.span({ "data-logoapi": "msft", "data-ticker": "row-7" });
  dom.load(); dom.run();
  assert.match(el.children[0].alt, /MSFT/);
});

test("package files: loader only, no install scripts", () => {
  const pkg = require("./package.json");
  for (const s of ["install", "preinstall", "postinstall", "prepack", "prepare"]) assert.ok(!(pkg.scripts || {})[s], s);
  assert.deepEqual(pkg.files, ["logo.js", "t/", "README.md", "LICENSE-MIT"]);
  assert.ok(Buffer.byteLength(LOADER) < 8192, "loader over 8 KB");
});

const T = path.join(__dirname, "t");
if (fs.existsSync(path.join(T, "sha256.json"))) {
  test("built files: each one decodes to the bytes it was built from", () => {
    const sums = JSON.parse(fs.readFileSync(path.join(T, "sha256.json"), "utf8"));
    let n = 0, size = 0;
    for (const [key, sum] of Object.entries(sums)) {
      const file = fs.readFileSync(path.join(__dirname, key + ".js"), "utf8");
      size += file.length;
      const [k, v] = valueOf(file);
      assert.equal(k, key);
      assert.equal(crypto.createHash("sha256").update(Buffer.from(v, "utf8")).digest("hex"), sum, key);
      n++;
    }
    assert.ok(n > 0);
    assert.ok(size < 60 * 1048576, "t/ over 60 MB");
    console.log(`  (${n} built files, ${(size / 1048576).toFixed(1)} MB)`);
  });
}

for (const [name, fn] of tests) {
  try { fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
if (failed) { console.log(failed + " failed"); process.exit(1); }
