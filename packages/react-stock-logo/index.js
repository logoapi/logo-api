'use strict';
const React = require('react');
const logos = require('stock-ticker-logos');

const HOST = logos.HOST;

function tile(label, size) {
  const t = String(label || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#e5e7eb"/>' +
    '<text x="32" y="40" font-family="Arial,sans-serif" font-size="24" font-weight="700" text-anchor="middle" fill="#4b5563">' +
    t + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Hosted URL for a ticker or domain. Exposed so tests and servers can reuse it. */
function srcFor(input, theme, square) {
  const base = theme === 'dark' ? logos.darkUrl(input) : logos.url(input);
  if (!base) return null;
  return square ? base + '?shape=square' : base;
}

function faviconUrl(domain) {
  const d = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  return d ? HOST + '/favicon/' + d : null;
}

// Shared <img>. Stage 0: the logo. Stage 1: the favicon route (when a domain is known).
// Stage 2: a letter tile. Each stage moves forward once, so a broken image never loops.
function Logo(props) {
  const { src, fallbackDomain, label, alt, size, onError, rest } = props;
  const [stage, setStage] = React.useState(0);
  React.useEffect(function () { setStage(0); }, [src]);
  const fav = faviconUrl(fallbackDomain);
  let current = src;
  if (stage === 1 && fav) current = fav;
  else if (stage >= 1 || !src) current = tile(label, size);
  const handleError = function (e) {
    if (typeof onError === 'function') onError(e);
    setStage(function (s) { return s === 0 && fav ? 1 : 2; });
  };
  return React.createElement('img', Object.assign({
    loading: 'lazy',
    decoding: 'async'
  }, rest, {
    src: current,
    alt: alt,
    width: size,
    height: size,
    onError: current.indexOf('data:') === 0 ? undefined : handleError
  }));
}

/**
 * Logo for a stock ticker, ETF or crypto coin.
 * Props: ticker, theme ('light' | 'dark'), shape ('square'), size (px), alt, domain (favicon fallback), onError.
 */
function StockLogo(props) {
  const { ticker, theme, shape, size, alt, domain, onError } = props;
  const rest = Object.assign({}, props);
  ['ticker', 'theme', 'shape', 'size', 'alt', 'domain', 'onError'].forEach(function (k) { delete rest[k]; });
  const px = size == null ? 32 : size;
  return React.createElement(Logo, {
    src: srcFor(ticker, theme, shape === 'square'),
    fallbackDomain: domain,
    label: ticker,
    alt: alt == null ? String(ticker == null ? '' : ticker).toUpperCase() + ' logo' : alt,
    size: px,
    onError: onError,
    rest: rest
  });
}

/**
 * Logo for a company domain.
 * Props: domain, theme ('light' | 'dark'), size (px), alt, onError.
 */
function CompanyLogo(props) {
  const { domain, theme, size, alt, onError } = props;
  const rest = Object.assign({}, props);
  ['domain', 'theme', 'shape', 'size', 'alt', 'onError'].forEach(function (k) { delete rest[k]; });
  const px = size == null ? 32 : size;
  return React.createElement(Logo, {
    src: srcFor(domain, theme, false),
    fallbackDomain: domain,
    label: domain,
    alt: alt == null ? String(domain == null ? '' : domain).replace(/^https?:\/\//, '').replace(/^www\./, '') + ' logo' : alt,
    size: px,
    onError: onError,
    rest: rest
  });
}

module.exports = { StockLogo: StockLogo, CompanyLogo: CompanyLogo, srcFor: srcFor, faviconUrl: faviconUrl, HOST: HOST };
module.exports.default = module.exports;
