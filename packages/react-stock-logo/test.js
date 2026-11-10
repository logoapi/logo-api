const assert = require('assert');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const pkg = require('./package.json');
const { StockLogo, CompanyLogo, faviconUrl } = require('./index.js');

const h = React.createElement;
const html = (el) => renderToStaticMarkup(el);
const get = (s, a) => (s.match(new RegExp(a + '="([^"]*)"')) || [])[1];

const cases = [
  [h(StockLogo, { ticker: 'aapl' }), 'https://logoapi.sh/ticker/AAPL.svg'],
  [h(StockLogo, { ticker: 'AAPL', theme: 'dark' }), 'https://logoapi.sh/dark/ticker/AAPL.svg'],
  [h(StockLogo, { ticker: 'NVDA', shape: 'square' }), 'https://logoapi.sh/ticker/NVDA.svg?shape=square'],
  [h(StockLogo, { ticker: 'NVDA', theme: 'dark', shape: 'square' }), 'https://logoapi.sh/dark/ticker/NVDA.svg?shape=square'],
  [h(StockLogo, { ticker: 'BTC' }), 'https://logoapi.sh/ticker/BTC.svg'],
  [h(CompanyLogo, { domain: 'stripe.com' }), 'https://logoapi.sh/icon/stripe.com.svg'],
  [h(CompanyLogo, { domain: 'https://www.stripe.com', theme: 'dark' }), 'https://logoapi.sh/dark/icon/stripe.com.svg']
];
const urls = [];
for (const [el, want] of cases) {
  const s = html(el);
  assert.strictEqual(get(s, 'src'), want, s);
  assert(s.includes('loading="lazy"'), s);
  urls.push(want);
}
const s = html(h(StockLogo, { ticker: 'AAPL', size: 48, className: 'x' }));
assert.strictEqual(get(s, 'width'), '48');
assert.strictEqual(get(s, 'height'), '48');
assert.strictEqual(get(s, 'alt'), 'AAPL logo');
assert(s.includes('class="x"'));
assert.strictEqual(get(html(h(StockLogo, { ticker: 'AAPL' })), 'width'), '32');
assert.strictEqual(get(html(h(CompanyLogo, { domain: 'stripe.com' })), 'alt'), 'stripe.com logo');
assert.strictEqual(get(html(h(StockLogo, { ticker: 'AAPL', alt: 'Apple' })), 'alt'), 'Apple');
// Bad input renders a letter tile, never throws.
assert(get(html(h(StockLogo, { ticker: '!!' })), 'src').startsWith('data:image/svg+xml'));
assert.strictEqual(faviconUrl('https://www.Stripe.com/x'), 'https://logoapi.sh/favicon/stripe.com');
// Bad ticker plus a domain starts at the favicon, not the letter tile.
assert.strictEqual(get(html(h(StockLogo, { ticker: '!!', domain: 'stripe.com' })), 'src'), 'https://logoapi.sh/favicon/stripe.com');
// Domain is normalized: scheme, path, query, hash, port, www.
assert.strictEqual(faviconUrl('https://www.Stripe.com:8080/a/b?x=1#h'), 'https://logoapi.sh/favicon/stripe.com');
assert.strictEqual(faviconUrl('stripe.com?x=1'), 'https://logoapi.sh/favicon/stripe.com');
assert.strictEqual(faviconUrl('stripe.com#top'), 'https://logoapi.sh/favicon/stripe.com');
assert.strictEqual(faviconUrl('not a domain'), null);
// Both entry points agree; React is a peer, our helper package is the only dependency.
assert.deepStrictEqual(Object.keys(pkg.dependencies), ['stock-ticker-logos']);
assert(pkg.peerDependencies.react);

(async () => {
  const mjs = await import('./index.mjs');
  assert.strictEqual(mjs.StockLogo, StockLogo);
  if (process.env.LIVE_URLS) {
    for (const u of urls.concat(faviconUrl('stripe.com'))) {
      const r = await fetch(u);
      assert.strictEqual(r.status, 200, u);
      assert(/^image\//.test(r.headers.get('content-type')), u);
      console.log('200', r.headers.get('content-type'), u);
    }
  }
  console.log('ok');
})();
