const assert = require('assert');
const { getLogo, hasLogo, list, getLogoPath, getLogos, url, iconUrl, darkUrl } = require('./index.js');
const H = 'https://logoapi.sh';

// Bundled: offline, unchanged since 0.1.
assert(getLogo('AAPL').includes('<svg'));
assert(getLogo('aapl') === getLogo('AAPL'));
assert(getLogo('apple.com') === getLogo('https://www.Apple.com/x'));
assert.strictEqual(getLogo('nope'), null);
assert.strictEqual(hasLogo('nope'), false);
assert(getLogoPath('apple.com').endsWith('.svg'));
assert(list().domains.length > 1000);

// ETH, BTC, ADA, XMR: the CC0 coin files are bundled and now reachable by symbol.
for (const sym of ['ETH', 'BTC', 'ADA', 'XMR']) {
  assert(hasLogo(sym), sym + ' should be bundled');
  assert(list().tickers.includes(sym));
}
assert.strictEqual(getLogo('eth'), getLogo('ethereum.org'));

// Every ticker in the package map points at a file that exists.
for (const t of list().tickers) assert(getLogoPath(t) && require('fs').existsSync(getLogoPath(t)), t);

// URL helpers: pure strings, every well-formed input gets one.
assert.strictEqual(url('GBTC'), H + '/ticker/GBTC.svg');
assert.strictEqual(url('aapl'), H + '/ticker/AAPL.svg');
assert.strictEqual(url('BRK.B'), H + '/ticker/BRK.B.svg');
assert.strictEqual(url('NASDAQ:MNDY'), H + '/ticker/NASDAQ:MNDY.svg');
assert.strictEqual(url('https://www.Stripe.com/pricing'), H + '/icon/stripe.com.svg');
assert.strictEqual(iconUrl('stripe.com'), H + '/icon/stripe.com.svg');
assert.strictEqual(darkUrl('ETH'), H + '/dark/ticker/ETH.svg');
assert.strictEqual(darkUrl('stripe.com'), H + '/dark/icon/stripe.com.svg');
for (const bad of ['', '   ', '../index', 'a b', null, undefined, 42, 'foo/../../etc', 'javascript:alert(1)']) {
  assert.strictEqual(url(bad), null, String(bad));
  assert.strictEqual(darkUrl(bad), null, String(bad));
}

// Batch: bundled hit, hosted fallback, ETH, GBTC, malformed.
const r = getLogos(['aapl', 'apple.com', 'ETH', 'GBTC', 'nope', 'unknown-brand.io', '../x']);
assert.strictEqual(r.length, 7);
assert.deepStrictEqual(
  [r[0].ticker, r[0].source, r[0].missing, r[0].url],
  ['aapl', 'cc0', false, H + '/ticker/AAPL.svg']
);
assert(r[0].dataUri.startsWith('data:image/svg+xml;base64,'));
assert.strictEqual(Buffer.from(r[0].dataUri.split(',')[1], 'base64').toString('utf8'), getLogo('AAPL'));
assert.strictEqual(r[1].source, 'cc0');
assert.strictEqual(r[2].source, 'cc0');
assert(r[2].dataUri);
assert.deepStrictEqual(r[3], { ticker: 'GBTC', dataUri: null, url: H + '/ticker/GBTC.svg', source: 'hosted', missing: false });
assert.deepStrictEqual(r[4], { ticker: 'nope', dataUri: null, url: H + '/ticker/NOPE.svg', source: 'hosted', missing: false });
assert.deepStrictEqual(r[5], { ticker: 'unknown-brand.io', dataUri: null, url: H + '/icon/unknown-brand.io.svg', source: 'hosted', missing: false });
assert.deepStrictEqual(r[6], { ticker: '../x', dataUri: null, url: null, source: null, missing: true });
assert.deepStrictEqual(getLogos([]), []);

// Object (API-only) entries in index.json never become a path; they come back hosted.
const idx = require('./index.json');
idx.tickers.ZZAPI = { api: 'https://logoapi.sh/ticker/ZZAPI.svg', official: 'official/tickers/ZZAPI.svg' };
idx.domains['zzapi.example'] = { api: 'x' };
assert.strictEqual(getLogoPath('ZZAPI'), null);
assert.strictEqual(getLogo('zzapi.example'), null);
assert.strictEqual(hasLogo('ZZAPI'), false);
assert(!list().tickers.includes('ZZAPI'));
assert.strictEqual(getLogos(['ZZAPI'])[0].source, 'hosted');
assert.strictEqual(getLogos(['ZZAPI'])[0].url, H + '/ticker/ZZAPI.svg');
delete idx.tickers.ZZAPI; delete idx.domains['zzapi.example'];

// No network anywhere in the package code.
const src = require('fs').readFileSync(require.resolve('./index.js'), 'utf8');
assert(!/require\(['"](https?|net|dns|tls|child_process)['"]\)|fetch\(/.test(src));
console.log('ok');
