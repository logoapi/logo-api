'use strict';
const fs = require('fs');
const path = require('path');
const base = require('logoapi');

const dir = path.join(__dirname, 'official', 'crypto');
const HOST = base.HOST;

// Coin symbols the API knows, written by prepack. Bundled marks are found on disk.
let known = new Set();
try {
  known = new Set(require('./official/index.json').coins || []);
} catch (e) {
  known = new Set();
}

function sym(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim().toUpperCase();
  return /^[A-Z0-9]{1,15}$/.test(s) ? s : null;
}

function coinPath(input) {
  const s = sym(input);
  if (!s) return null;
  const p = path.join(dir, s + '.svg');
  return fs.existsSync(p) ? p : null;
}

function isCoin(input) {
  const s = sym(input);
  return !!s && (known.has(s) || coinPath(s) !== null);
}

function getLogoPath(input) {
  return coinPath(input) || base.getLogoPath(input);
}

function getLogo(input) {
  const p = coinPath(input);
  return p ? fs.readFileSync(p, 'utf8') : base.getLogo(input);
}

function hasLogo(input) {
  return coinPath(input) !== null || base.hasLogo(input);
}

function list() {
  const crypto = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => n.endsWith('.svg')).map((n) => n.slice(0, -4)).sort()
    : [];
  return Object.assign({}, base.list(), { crypto });
}

// Hosted URLs: coins the API knows use /crypto/, everything else follows logoapi (/ticker/, /icon/).
function iconUrl(input) {
  return isCoin(input) ? HOST + '/crypto/' + sym(input) + '.svg' : base.iconUrl(input);
}

function url(input) {
  return iconUrl(input);
}

function darkUrl(input) {
  return isCoin(input) ? HOST + '/dark/crypto/' + sym(input) + '.svg' : base.darkUrl(input);
}

function getLogos(items) {
  if (!Array.isArray(items)) throw new TypeError('getLogos expects an array');
  return items.map((item) => {
    const p = coinPath(item);
    if (p) {
      return {
        ticker: item,
        dataUri: 'data:image/svg+xml;base64,' + fs.readFileSync(p).toString('base64'),
        url: url(item),
        source: 'official',
        missing: false
      };
    }
    const r = base.getLogos([item])[0];
    return r.missing ? r : Object.assign({}, r, { url: url(item) });
  });
}

module.exports = { getLogo, getLogoPath, hasLogo, list, getLogos, url, iconUrl, darkUrl, HOST };
