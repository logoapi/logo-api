// Measures candidate favicon tiles against their plate in headless Chrome and
// writes scripts/favicon-ok.json ({ "t/SYM": sha256 of the tile }). The build
// swaps in a favicon tile only when its exact bytes are listed there, so the
// build itself needs no browser and a changed favicon is never used unchecked.
// scripts/favicon-allow.txt forces a reviewed tile in when the check is wrong.
// Steps: npm run build (writes .favicon-candidates.json), then
// PLAYWRIGHT=/path/to/playwright node scripts/check-favicons.mjs, then build again.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Read at a 28px tile on a 2x screen (56 device px). Shares are of the image box.
// Dark plate: at least 6% of the box at 4.5:1 against the plate. Light plate: 6%
// at 3:1, or 30% at 2:1 (large mid-tone marks). Unless the icon fills its box,
// 60% of the pixels that differ from the plate at all must reach 2:1, so half a
// mark never fades out (thin rings, dark halves).
export function visible(st, dark) {
  const strong = dark ? st.p45 >= 0.06 : st.p3 >= 0.06 || st.p2 >= 0.3;
  const whole = st.cover >= 0.95 || (st.p115 > 0 && st.p2 / st.p115 >= 0.6);
  return strong && whole;
}

async function main() {
  const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT || "playwright");
  const cand = JSON.parse(await readFile(join(ROOT, ".favicon-candidates.json"), "utf8"));
  const keys = Object.keys(cand).sort();
  const b = await pw.chromium.launch();
  const p = await b.newPage();
  const stats = {};
  for (let i = 0; i < keys.length; i += 40) Object.assign(stats, await p.evaluate(measure, keys.slice(i, i + 40).map((k) => [k, cand[k]])));
  await b.close();
  const allow = new Set((await readFile(join(ROOT, "scripts", "favicon-allow.txt"), "utf8")).split("\n")
    .map((l) => l.replace(/#.*/, "").trim().split(/\s+/)[0]).filter(Boolean));
  const ok = {}, low = [];
  for (const k of keys) {
    if (allow.has(k) || (stats[k] && visible(stats[k], k.startsWith("t/dark/")))) ok[k] = createHash("sha256").update(cand[k], "utf8").digest("hex");
    else low.push(k);
  }
  await writeFile(join(ROOT, "scripts", "favicon-ok.json"), "{\n" + Object.keys(ok).map((k) => JSON.stringify(k) + ": " + JSON.stringify(ok[k])).join(",\n") + "\n}\n");
  const si = process.argv.indexOf("--stats");
  if (si > 0) await writeFile(process.argv[si + 1], JSON.stringify(stats));
  console.log(`checked ${keys.length} favicon tiles: ${Object.keys(ok).length} pass, ${low.length} too faint:\n${low.join(" ")}`);
}

// Runs in the page: draws the tile's images alone (as the SVG would, meet),
// composites each pixel on the plate colour and counts contrast shares.
async function measure(chunk) {
  const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const out = {};
  for (const [key, svg] of chunk) {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const rect = doc.querySelector("rect");
    const fill = (rect && rect.getAttribute("fill")) || "#ffffff";
    const pc = [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16)), pl = lum(...pc);
    const S = 56, k = S / 64, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d");
    let box = 0;
    for (const im of doc.querySelectorAll("image")) {
      const img = new Image(); img.src = im.getAttribute("href") || im.getAttribute("xlink:href");
      try { await img.decode(); } catch (e) { continue; }
      const w = +im.getAttribute("width"), h = +im.getAttribute("height");
      const nw = img.naturalWidth || w, nh = img.naturalHeight || h, r = Math.min(w / nw, h / nh);
      g.drawImage(img, (+im.getAttribute("x") + (w - nw * r) / 2) * k, (+im.getAttribute("y") + (h - nh * r) / 2) * k, nw * r * k, nh * r * k);
      box += w * h * k * k;
    }
    const d = g.getImageData(0, 0, S, S).data;
    const st = { cover: 0, p115: 0, p2: 0, p3: 0, p45: 0 };
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255; if (a < 0.1) continue;
      const x = cr(lum(d[i] * a + pc[0] * (1 - a), d[i + 1] * a + pc[1] * (1 - a), d[i + 2] * a + pc[2] * (1 - a)), pl);
      st.cover++; if (x >= 1.15) st.p115++; if (x >= 2) st.p2++; if (x >= 3) st.p3++; if (x >= 4.5) st.p45++;
    }
    for (const n in st) st[n] = box ? st[n] / box : 0;
    out[key] = st;
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
