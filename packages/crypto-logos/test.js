const assert = require('assert');
const { getLogo, hasLogo, list, getLogoPath, getLogos, url, darkUrl } = require('./index.js');
const H = 'https://logoapi.sh';

// Bundled, offline.
assert(getLogo('BTC').includes('<svg'));
assert.strictEqual(getLogo('btc'), getLogo('BTC'));
assert(getLogoPath('eth').endsWith('ETH.svg'));
assert(hasLogo('SOL'));
assert(getLogo('AAPL').includes('<svg'));
assert.strictEqual(getLogo('nope'), null);
assert.strictEqual(getLogo('../index'), null);
assert(list().crypto.includes('BTC'));
assert(list().tickers.length > 0);

// URL helpers.
assert.strictEqual(url('eth'), H + '/crypto/ETH.svg');
assert.strictEqual(darkUrl('ETH'), H + '/dark/crypto/ETH.svg');
assert.strictEqual(url('DOGE'), H + '/crypto/DOGE.svg'); // known coin, not bundled
assert.strictEqual(url('GBTC'), H + '/ticker/GBTC.svg'); // Grayscale trust is a stock ticker
assert.strictEqual(url('AAPL'), H + '/ticker/AAPL.svg');
assert.strictEqual(darkUrl('stripe.com'), H + '/dark/icon/stripe.com.svg');
assert.strictEqual(url('../index'), null);

// Batch: bundled coin, bundled ticker, hosted coin, hosted ticker, malformed.
const r = getLogos(['btc', 'AAPL', 'ETH', 'DOGE', 'GBTC', 'nope', '../x']);
assert.strictEqual(r[0].source, 'official');
assert.strictEqual(r[0].ticker, 'btc');
assert.strictEqual(r[0].url, H + '/crypto/BTC.svg');
assert(r[0].dataUri.startsWith('data:image/svg+xml;base64,'));
assert.strictEqual(r[1].source, 'cc0');
assert.strictEqual(r[1].url, H + '/ticker/AAPL.svg');
assert.strictEqual(r[2].source, 'official');
assert.deepStrictEqual(r[3], { ticker: 'DOGE', dataUri: null, url: H + '/crypto/DOGE.svg', source: 'hosted', missing: false });
assert.deepStrictEqual(r[4], { ticker: 'GBTC', dataUri: null, url: H + '/ticker/GBTC.svg', source: 'hosted', missing: false });
assert.deepStrictEqual(r[5], { ticker: 'nope', dataUri: null, url: H + '/ticker/NOPE.svg', source: 'hosted', missing: false });
assert.deepStrictEqual(r[6], { ticker: '../x', dataUri: null, url: null, source: null, missing: true });
console.log('ok');
