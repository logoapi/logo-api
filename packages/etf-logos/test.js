const assert = require('assert');
const pkg = require('./package.json');
const alias = require('./index.js');
const base = require('logoapi');
// An alias: same exports, same results.
assert.deepStrictEqual(Object.keys(alias).sort(), Object.keys(base).sort());
assert.strictEqual(alias.url('aapl'), 'https://logoapi.sh/ticker/AAPL.svg');
assert.strictEqual(alias.darkUrl('BTC'), 'https://logoapi.sh/dark/ticker/BTC.svg');
assert(alias.getLogo('AAPL').includes('<svg'));
assert.strictEqual(alias.getLogos(['VOO'])[0].source, 'hosted');
assert.strictEqual(pkg.dependencies.logoapi, '^' + pkg.version);
console.log('ok');
