// Layout tests in headless Chrome (Playwright). Skipped when Playwright is not
// installed; set PLAYWRIGHT=/path/to/node_modules/playwright to point at one.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
let pw;
try { pw = require(process.env.PLAYWRIGHT || "playwright"); } catch (e) {
  if (process.env.CI) { console.log("FAIL browser tests need Playwright in CI"); process.exit(1); }
  console.log("skip browser tests (no playwright)"); process.exit(0);
}
const { toScriptSrc } = { toScriptSrc: (k, svg) => "(self.LOGOAPI_Q=self.LOGOAPI_Q||[]).push([" + JSON.stringify(k) + "," + JSON.stringify(svg) + "]);" };

const BASE = "https://cdn.test/logoapi-script/";
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0a7"/></svg>';
const LOADER = fs.readFileSync(path.join(__dirname, "logo.js"), "utf8");
// The CSS Claude wrote in a real claude.ai artifact (2026-11-13).
const BUG_CSS = ".logo{width:40px;height:40px;display:grid;place-items:center;background:#fff}" +
  ".logo>span{display:grid;place-items:center;width:100%;height:100%}" +
  ".logo img{max-width:28px;max-height:28px;width:auto;height:auto;display:block}";

function page(css, body, csp) {
  return "<!doctype html><meta charset=utf-8>" + (csp ? '<meta http-equiv="Content-Security-Policy" content="' + csp + '">' : "") +
    "<style>" + css + "</style><script src='" + BASE + "logo.js'></script>" + body;
}

async function main() {
  const b = await pw.chromium.launch();
  let failed = 0;
  async function run(name, html, check, n, wait) {
    const p = await b.newPage({ viewport: { width: 600, height: 400 } });
    await p.route("https://cdn.test/**", (r) => {
      const rel = r.request().url().slice(BASE.length);
      if (rel === "logo.js") return r.fulfill({ contentType: "text/javascript", body: LOADER });
      if (/^t\/(dark\/)?(AAPL|MSFT)\.js$/.test(rel)) return r.fulfill({ contentType: "text/javascript", body: toScriptSrc(rel.slice(0, -3), SVG) });
      return r.fulfill({ status: 404, body: "" });
    });
    await p.route("https://page.test/", (r) => r.fulfill({ contentType: "text/html", body: html }));
    await p.goto("https://page.test/");
    await p.waitForFunction((n) => { const a = [...document.querySelectorAll("[data-ticker]")]; return a.length >= n && a.every((e) => e.firstElementChild); }, n || 1, { timeout: 5000 });
    await p.waitForTimeout(wait || 50);
    const r = await p.evaluate(() => [...document.querySelectorAll("[data-ticker]")].map((e) => {
      const box = (e.closest(".logo") || e).getBoundingClientRect(), c = e.firstElementChild.getBoundingClientRect();
      return { tag: c.width && e.firstElementChild.tagName, box: [box.x, box.y, box.width, box.height], c: [c.x, c.y, c.width, c.height], disp: e.style.display };
    }));
    try { await check(r, p); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message + "\n     " + JSON.stringify(r)); }
    await p.close();
  }
  const assert = require("node:assert/strict");
  const centred = (x) => {
    const dx = (x.c[0] + x.c[2] / 2) - (x.box[0] + x.box[2] / 2), dy = (x.c[1] + x.c[3] / 2) - (x.box[1] + x.box[3] / 2);
    assert.ok(Math.abs(dx) <= 1 && Math.abs(dy) <= 1, "off centre by " + dx + "," + dy);
  };
  const tick = (t, extra) => '<div class="logo"><span data-ticker="' + t + '"' + (extra || "") + "></span></div>";

  await run("page tile CSS: logo centred, 28px square, light + dark", page(BUG_CSS,
    tick("AAPL") + tick("AAPL", ' data-theme="dark"')), (r) => {
    for (const x of r) { centred(x); assert.deepEqual(x.c.slice(2), [28, 28]); assert.equal(x.disp, ""); }
  }, 2);
  await run("page tile CSS: node added later is centred", page(BUG_CSS,
    "<div id=x></div><script>setTimeout(function(){x.innerHTML='" + tick("AAPL") + "'},100)</script>"), (r) => {
    centred(r[0]); assert.deepEqual(r[0].c.slice(2), [28, 28]);
  }, 1);
  await run("page tile CSS, images blocked: inline SVG centred", page(BUG_CSS, tick("AAPL", ' data-size="32"'),
    "default-src 'none'; script-src 'unsafe-inline' https://cdn.test; style-src 'unsafe-inline'; img-src 'none'"), (r) => {
    assert.equal(r[0].tag, "SPAN"); centred(r[0]);
  });
  await run("page caps the logo, tile and inline SVG: each stays square and centred, light + dark", page(
    ".logo{width:40px;height:40px;display:grid;place-items:center} .logo [data-ticker]>*{max-width:30px;max-height:30px}",
    tick("AAPL") + tick("AAPL", ' data-theme="dark"') + tick("ZZZQ") + tick("ZZZQ", ' data-theme="dark"')), (r) => {
    for (const x of r) { centred(x); assert.deepEqual(x.c.slice(2), [30, 30]); }
  }, 4);
  await run("page caps one side only: still square and centred", page(
    ".logo{width:40px;height:40px;display:grid;place-items:center} .logo [data-ticker]>*{max-width:30px}",
    tick("AAPL") + tick("ZZZQ")), (r) => {
    for (const x of r) { centred(x); assert.deepEqual(x.c.slice(2), [30, 30]); }
  }, 2);
  await run("host hidden at first scan is fitted once shown", page("",
    '<p>a <span id=h data-ticker="AAPL" hidden></span> b</p><script>setTimeout(function(){h.hidden=false;document.body.appendChild(document.createElement("i"))},300)</script>'), (r) => {
    assert.equal(r[0].disp, "inline-flex"); assert.deepEqual(r[0].box.slice(2), [48, 48]);
  }, 1, 600);
  const ROWS = "<ul id=l></ul><script>function row(t,n){var li=document.createElement('li');li.dataset.ticker=t;" +
    "li.innerHTML='<span data-ticker=\"'+t+'\" data-size=\"24\"></span><b>'+n+'</b><input value=1><a href=#>x</a>';l.appendChild(li)}" +
    "row('AAPL','Apple');row('MSFT','Microsoft')</script>";
  const rowCheck = (p) => p.evaluate(() => [...document.querySelectorAll("li")].map((li) =>
    [li.children.length, li.children[0].tagName, li.children[0].children[0] && li.children[0].children[0].tagName, li.querySelector("b").textContent].join(" ")));
  await run("row with its own data-ticker keeps its content, inner span gets the logo; sort, theme, size, later rows", page("", ROWS), async (r, p) => {
    assert.deepEqual(await rowCheck(p), ["4 SPAN IMG Apple", "4 SPAN IMG Microsoft"]);
    await p.evaluate(() => { const l = document.getElementById("l"); [...l.children].reverse().forEach((li) => l.appendChild(li)); });
    await p.waitForTimeout(100);
    assert.deepEqual(await rowCheck(p), ["4 SPAN IMG Microsoft", "4 SPAN IMG Apple"]);
    await p.evaluate(() => { const s = document.querySelector("li span"); s.dataset.theme = "dark"; s.dataset.size = "32"; row("AAPL", "Apple 2"); });
    await p.waitForTimeout(300);
    assert.deepEqual(await rowCheck(p), ["4 SPAN IMG Microsoft", "4 SPAN IMG Apple", "4 SPAN IMG Apple 2"]);
    const img = await p.evaluate(() => { const i = document.querySelector("li span img"); return [i.width, i.alt]; });
    assert.deepEqual(img, [32, "MSFT logo"]);
    assert.ok(await p.evaluate(() => performance.getEntriesByType("resource").some((e) => e.name.endsWith("t/dark/MSFT.js"))));
  }, 4);
  await run("no page CSS: 48px square, host sized to it", page("", '<span data-ticker="AAPL"></span> <span data-ticker="ZZZQ" data-size="32"></span>'), (r) => {
    assert.deepEqual(r[0].c.slice(2), [48, 48]); assert.deepEqual(r[0].box.slice(2), [48, 48]); assert.equal(r[0].disp, "inline-flex");
    assert.deepEqual(r[1].c.slice(2), [32, 32]); assert.deepEqual(r[1].box.slice(2), [32, 32]);
    for (const x of r) centred(x);
  }, 2);
  await b.close();
  if (failed) { console.log(failed + " failed"); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
