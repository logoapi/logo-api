// Copies the CC0 catalog from the repo root into this package before npm pack.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..', '..');
const pkg = path.join(__dirname, '..');
// Filtered copy: only domains and tickers whose values are repo paths (strings).
// The root index.json also carries API-only tickers, coins and URL patterns; keep them out of the tarball.
const full = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
const onlyStrings = (m) => Object.fromEntries(Object.entries(m || {}).filter(([, v]) => typeof v === 'string'));
const filtered = { domains: onlyStrings(full.domains), tickers: onlyStrings(full.tickers) };
// Coins with a bundled CC0 file (ethereum.svg) but no string ticker key (ETH) in the root index.
const aliases = JSON.parse(fs.readFileSync(path.join(__dirname, 'coin-aliases.json'), 'utf8'));
for (const [sym, rel] of Object.entries(aliases)) {
  if (sym.startsWith('_')) continue;
  if (typeof filtered.tickers[sym] === 'string') continue; // the root index already bundles it
  filtered.tickers[sym] = rel;
}
filtered.tickers = Object.fromEntries(Object.entries(filtered.tickers).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
// Small install (#1072): bundle only the files behind a ticker or coin symbol. Hosted URLs cover the rest.
// A domain stays bundled only when its file is one of those (apple.com -> logos/apple.svg).
const keep = new Set(Object.values(filtered.tickers));
filtered.domains = Object.fromEntries(Object.entries(filtered.domains).filter(([, rel]) => keep.has(rel)));
fs.rmSync(path.join(pkg, 'logos'), { recursive: true, force: true });
for (const rel of keep) {
  if (!/^logos\/[A-Za-z0-9._-]+\.svg$/.test(rel)) throw new Error('unexpected bundled path: ' + rel);
  fs.mkdirSync(path.dirname(path.join(pkg, rel)), { recursive: true });
  fs.copyFileSync(path.join(root, rel), path.join(pkg, rel));
}
fs.writeFileSync(path.join(pkg, 'index.json'), JSON.stringify(filtered, null, 1) + '\n');
fs.copyFileSync(path.join(root, 'NOTICE'), path.join(pkg, 'NOTICE')); // CC0 + trademark terms; the code licence is LICENSE-MIT
fs.rmSync(path.join(pkg, 'LICENSE'), { force: true }); // npm always packs a LICENSE file; drop a stale copy from older prepacks
const idx = JSON.parse(fs.readFileSync(path.join(pkg, 'index.json'), 'utf8'));
for (const m of [idx.domains, idx.tickers]) {
  for (const p of Object.values(m)) {
    if (typeof p !== 'string') continue; // API-only entries are objects, not repo paths
    if (!fs.existsSync(path.join(pkg, p))) throw new Error('index.json points to a missing file: ' + p);
  }
}

// Regenerate the "Bundled tickers" section of llms.txt from index.json so it cannot drift.
const llmsPath = path.join(pkg, 'llms.txt');
const llms = fs.readFileSync(llmsPath, 'utf8');
const start = '<!-- tickers:start -->';
const end = '<!-- tickers:end -->';
const a = llms.indexOf(start);
const b = llms.indexOf(end);
if (a === -1 || b === -1 || b < a) throw new Error('llms.txt is missing the tickers markers');
const syms = Object.keys(idx.tickers).filter((k) => typeof idx.tickers[k] === 'string').sort();
const block = start + '\n' + syms.length + ' tickers: ' + syms.join(', ') + '\n' + end;
fs.writeFileSync(llmsPath, llms.slice(0, a) + block + llms.slice(b + end.length));
