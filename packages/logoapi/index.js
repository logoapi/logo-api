'use strict';
const fs = require('fs');
const path = require('path');

const index = require('./index.json');
const domains = index.domains;
const tickers = index.tickers;

const HOST = 'https://logoapi.sh';

const own = (map, key) =>
  Object.prototype.hasOwnProperty.call(map, key) && typeof map[key] === 'string' ? map[key] : null;

// A symbol: AAPL, BRK.B, BRK-B, NASDAQ:MNDY, BTC. A domain always has a dot and a letter TLD.
const SYMBOL = /^(?:[A-Z]{1,10}:)?[A-Z0-9]{1,10}(?:[.-][A-Z0-9]{1,4})?$/;
const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function normDomain(s) {
  s = s.toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '');
  return s.replace(/\.$/, '');
}

/** Classify an input as { kind: 'ticker' | 'domain', key } or null when it is not well formed. */
function parse(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;
  const up = s.toUpperCase();
  if (SYMBOL.test(up) && !/^[A-Z0-9-]+\.[A-Z]{2,}$/.test(up)) return { kind: 'ticker', key: up };
  let d = normDomain(s);
  if (d.startsWith('www.')) d = d.slice(4);
  if (DOMAIN.test(d)) return { kind: 'domain', key: d };
  return null;
}

function resolve(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s) return null;
  const tk = own(tickers, s.toUpperCase());
  if (tk) return tk;
  s = normDomain(s);
  const dm = own(domains, s);
  if (dm) return dm;
  if (s.startsWith('www.')) return own(domains, s.slice(4));
  return null;
}

function getLogoPath(domainOrTicker) {
  const rel = resolve(domainOrTicker);
  return rel ? path.join(__dirname, rel) : null;
}

function getLogo(domainOrTicker) {
  const p = getLogoPath(domainOrTicker);
  return p ? fs.readFileSync(p, 'utf8') : null;
}

function hasLogo(domainOrTicker) {
  return resolve(domainOrTicker) !== null;
}

function list() {
  return {
    domains: Object.keys(domains).filter((k) => typeof domains[k] === 'string').sort(),
    tickers: Object.keys(tickers).filter((k) => typeof tickers[k] === 'string').sort()
  };
}

// Hosted URLs. Pure string builders: no file access, no network.
// Tickers and coins use /ticker/ (square icon by default; coins answer their coin mark).
// Domains use /icon/ (square mark). The server, not this package, decides the image.
function iconUrl(input) {
  const p = parse(input);
  if (!p) return null;
  return p.kind === 'ticker'
    ? HOST + '/ticker/' + p.key + '.svg'
    : HOST + '/icon/' + p.key + '.svg';
}

function url(input) {
  return iconUrl(input);
}

function darkUrl(input) {
  const u = iconUrl(input);
  return u ? HOST + '/dark' + u.slice(HOST.length) : null;
}

function row(item, rel, hosted) {
  if (rel) {
    return {
      ticker: item,
      dataUri: 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(__dirname, rel)).toString('base64'),
      url: hosted,
      source: 'cc0',
      missing: false
    };
  }
  if (hosted) return { ticker: item, dataUri: null, url: hosted, source: 'hosted', missing: false };
  return { ticker: item, dataUri: null, url: null, source: null, missing: true };
}

function getLogos(items) {
  if (!Array.isArray(items)) throw new TypeError('getLogos expects an array');
  return items.map((item) => row(item, resolve(item), url(item)));
}

module.exports = { getLogo, getLogoPath, hasLogo, list, getLogos, url, iconUrl, darkUrl, HOST };
