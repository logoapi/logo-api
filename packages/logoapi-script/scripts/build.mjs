// Builds t/<SYM>.js and t/dark/<SYM>.js from the live logoapi.sh square tiles.
// Each file carries the exact response body (checked byte for byte), never a redraw.
// Only catalog logos are kept: the build asks with ?fallback=404, so favicon and
// letter-tile stand-ins are 404 and get no file (the loader shows a letter tile).
// One exception: when that answer is a wordmark (too small to read in a tile) and
// the plain ?shape=square answer is the brand's own favicon, sharp, not in
// scripts/favicon-exclude.txt, and listed with the same sha256 in
// scripts/favicon-ok.json (contrast check, scripts/check-favicons.mjs), the
// favicon tile is used instead. Every sharp candidate goes to .favicon-candidates.json.
// Run once before packing: node scripts/build.mjs [--only AAPL,MSFT]. Needs network.
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "https://logoapi.sh";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "logoapi-script-build (+https://github.com/logoapi/logo-api)";
const CONCURRENCY = 6;

// Same rule as logoapi.sh and the loader: BRK.B, BRK-B, BRK/B -> BRKB.
export const norm = (s) => String(s).trim().toUpperCase().replace(/^[A-Z]+:/, "").replace(/[.\-\/]/g, "");

// One plain statement. Non-ASCII is escaped, so the file is ASCII and the string
// value is identical to the SVG text whatever charset the CDN sends.
export function toScript(key, svg) {
  const lit = JSON.stringify(svg).replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  return "(self.LOGOAPI_Q=self.LOGOAPI_Q||[]).push([" + JSON.stringify(key) + "," + lit + "]);\n";
}

// Exact text of the response bytes, or throw.
export function exactText(buf) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  if (!Buffer.from(text, "utf8").equals(Buffer.from(buf))) throw new Error("bytes do not round-trip");
  return text;
}

// A favicon tile is sharp when every embedded image is SVG (checked the same way
// inside; #id links allowed) or PNG at least MIN_PX on its short side. The image area of a 64px tile
// is 44.8px, so 48px is never upscaled. Any href this cannot parse fails.
export const MIN_PX = 48;
export function sharpFavicon(svg) {
  const hrefs = svg.match(/href\s*=(?!\s*["']#)/g) || []; // #id links stay inside the SVG
  const imgs = [...svg.matchAll(/\bhref="data:image\/(png|svg\+xml);base64,([A-Za-z0-9+\/]+={0,2})"/g)];
  if (imgs.length !== hrefs.length) return false;
  for (const [, type, b64] of imgs) {
    const b = Buffer.from(b64, "base64");
    if (type === "svg+xml") { if (!sharpFavicon(b.toString("utf8"))) return false; continue; }
    if (b.length < 24 || b.toString("latin1", 12, 16) !== "IHDR") return false;
    if (Math.min(b.readUInt32BE(16), b.readUInt32BE(20)) < MIN_PX) return false;
  }
  return true;
}

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("HTTP " + r.status);
      const ct = r.headers.get("content-type") || "";
      if (!ct.startsWith("image/svg+xml")) throw new Error("content-type " + ct);
      const buf = new Uint8Array(await r.arrayBuffer());
      buf.kind = r.headers.get("x-logo-kind") || "";
      return buf;
    } catch (e) {
      if (i >= tries) throw new Error(url + ": " + e.message);
      await new Promise((res) => setTimeout(res, 500 * i));
    }
  }
}

async function candidates() {
  const out = new Set();
  const all = await (await fetch(HOST + "/ticker/bundle/all.json", { headers: { "User-Agent": UA } })).json();
  for (const r of all) out.add(norm(r.symbol));
  const idx = JSON.parse(await readFile(join(ROOT, "..", "..", "index.json"), "utf8"));
  for (const k of Object.keys(idx.tickers || {})) out.add(norm(k));
  for (const k of Object.keys(idx.crypto || {})) out.add(norm(k));
  const coins = JSON.parse(await readFile(join(ROOT, "scripts", "coins.json"), "utf8"));
  for (const k of coins) out.add(norm(k));
  return [...out].filter((s) => /^[A-Z0-9]{1,15}$/.test(s)).sort();
}

async function pool(items, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",").map(norm) : null;
  const syms = only || (await candidates());
  // Build into t.tmp and swap in only after every symbol succeeded: a failed run
  // never leaves a partial t/ behind.
  const OUT = join(ROOT, "t.tmp");
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "dark"), { recursive: true });
  const list = { light: [], dark: [], favicon: [] };
  const exclude = new Set((await readFile(join(ROOT, "scripts", "favicon-exclude.txt"), "utf8")).split("\n")
    .map((l) => l.replace(/#.*/, "").trim().split(/\s+/)[0]).filter(Boolean).map(norm));
  const okList = JSON.parse(await readFile(join(ROOT, "scripts", "favicon-ok.json"), "utf8"));
  const cand = {};
  const sha = (b) => createHash("sha256").update(b).digest("hex");
  const sums = {};
  let bytes = 0;
  await pool(syms.flatMap((s) => [[s, false], [s, true]]), async ([sym, dark]) => {
    let url = HOST + (dark ? "/dark" : "") + "/ticker/" + encodeURIComponent(sym) + ".svg?shape=square&fallback=404";
    let buf = await get(url);
    if (!buf) return;
    let svg = exactText(buf);
    const key = (dark ? "t/dark/" : "t/") + sym;
    if (buf.kind === "wordmark" && !exclude.has(sym)) {
      const fu = url.replace("&fallback=404", "");
      const fb = await get(fu);
      if (fb && fb.kind === "favicon") {
        const ft = exactText(fb);
        if (sharpFavicon(ft)) {
          cand[key] = ft;
          if (okList[key] === sha(fb)) { url = fu; buf = fb; svg = ft; list.favicon.push(key); }
        }
      }
    }
    if (!/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/.test(svg)) throw new Error(url + ": not an SVG");
    const file = toScript(key, svg);
    await writeFile(join(OUT, key.slice(2) + ".js"), file);
    list[dark ? "dark" : "light"].push(sym);
    sums[key] = createHash("sha256").update(buf).digest("hex");
    bytes += file.length;
  });
  list.light.sort(); list.dark.sort(); list.favicon.sort();
  await writeFile(join(OUT, "list.json"), JSON.stringify({ source: HOST, built: new Date().toISOString(), light: list.light, dark: list.dark, favicon: list.favicon }) + "\n");
  await writeFile(join(OUT, "sha256.json"), JSON.stringify(sums) + "\n");
  if (!only) await writeFile(join(ROOT, ".favicon-candidates.json"), JSON.stringify(cand) + "\n");
  await rm(join(ROOT, "t"), { recursive: true, force: true });
  await rename(OUT, join(ROOT, "t"));
  console.log(`checked ${syms.length} symbols: ${list.light.length} light, ${list.dark.length} dark (${list.favicon.length} favicon tiles of ${Object.keys(cand).length} candidates), ${(bytes / 1048576).toFixed(1)} MB`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
