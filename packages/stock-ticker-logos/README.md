# stock-ticker-logos

A logo URL for any stock ticker, ETF or coin, plus 54 bundled SVGs for offline use. Alias of logoapi.

```bash
npm install stock-ticker-logos
```

URL example, no code needed:

```html
<img src="https://logoapi.sh/ticker/AAPL.svg" alt="Apple logo" height="32">
```

Renders as: ![Apple logo](https://logoapi.sh/ticker/AAPL.svg)

- Limits: 2M requests a month per site. Free, no key, no attribution.
- Catalog: about 1,500 vector marks across tickers and domains. Everything else gets the site's favicon or a name tile, and the `X-Logo-Fallback` response header says so. Add `?fallback=404` to get a 404 instead.
- Source: [github.com/logoapi/logo-api](https://github.com/logoapi/logo-api). Docs: [logoapi.sh/docs](https://logoapi.sh/docs).

```jsx
import { url } from 'stock-ticker-logos';
<img src={url('AAPL')} alt="AAPL logo" />  // https://logoapi.sh/ticker/AAPL.svg
```

Stock logos and stock ticker logos: a hosted logoapi.sh SVG URL for any ticker, ETF or coin, plus 54 ticker and coin SVGs bundled offline. No key, small install. Alias of logoapi.

Covers 6,562 stock and ETF tickers, 17 coins and 5,000+ company domains. No attribution required.

Hosted service: the URLs point at logoapi.sh, served from Cloudflare's edge. Free, no key, 2M requests a month per site. Any free-tier cut gets 12 months' notice ([terms](https://logoapi.sh/terms)). The ticker index is open on GitHub: [index.json](https://github.com/logoapi/logo-api/blob/main/index.json).

```js
// npm install stock-ticker-logos
import { getLogos, darkUrl } from 'stock-ticker-logos';

// A watchlist: stocks, an ETF and crypto, by symbol.
const rows = getLogos(['AAPL', 'NVDA', 'SPY', 'BTC', 'ETH', 'GBTC']);
const html = rows
  .map((r) => `<img src="${r.dataUri || r.url}" alt="${r.ticker}" width="32" height="32">`)
  .join('');
// AAPL, NVDA, BTC, ETH: bundled SVG, no network. SPY, GBTC: r.url = https://logoapi.sh/ticker/SPY.svg (source: 'hosted').

darkUrl('AAPL'); // dark mode: 'https://logoapi.sh/dark/ticker/AAPL.svg'
```

This package is an alias of `logoapi`; install that one directly if you prefer. It re-exports `getLogos`, `url`, `iconUrl`, `darkUrl`, `getLogo`, `getLogoPath`, `hasLogo` and `list`.

`getLogo()` returns bundled SVG markup, or `null` when the file is not bundled (offline only). `url(id)` and `getLogos()` return a hosted URL for every well-formed ticker, coin or domain. A symbol the API does not know answers 404 on that URL, so keep a letter tile, and never substitute another company's logo.

### Batch lookup

```js
import { getLogos } from 'stock-ticker-logos';

getLogos(['AAPL', 'GBTC', '../x']);
// [
//   { ticker: 'AAPL', dataUri: 'data:image/svg+xml;base64,...', url: 'https://logoapi.sh/ticker/AAPL.svg', source: 'cc0',    missing: false },
//   { ticker: 'GBTC', dataUri: null,                            url: 'https://logoapi.sh/ticker/GBTC.svg', source: 'hosted', missing: false },
//   { ticker: '../x', dataUri: null,                            url: null,                                 source: null,     missing: true }
// ]
```

`getLogos(list)` returns one object per input item, in order: `ticker` (your input), `dataUri` (bundled file or `null`), `url` (hosted URL), `source` (`'cc0' | 'official' | 'hosted' | null`) and `missing` (`true` only for malformed input). Use `dataUri || url` as the image `src`.

## Hosted API

Free, no key, no attribution. Docs: https://logoapi.sh/docs

2M requests a month per site, free, no key. Free stays free. 12 months' notice before any change.

| What you need | URL |
| --- | --- |
| Stock ticker, square icon (ETFs map to the issuer) | `https://logoapi.sh/ticker/{SYM}` (same as `/icon/ticker/{SYM}`) |
| Ticker full logo | `https://logoapi.sh/ticker/{SYM}.svg?variant=full` |
| Ticker dark | `https://logoapi.sh/dark/ticker/{SYM}.svg` (square icon; `?variant=full` for the full logo), `/dark/icon/ticker/{SYM}.svg` (icon) |
| Crypto coin | `https://logoapi.sh/crypto/{SYM}` (dark: `/dark/crypto/{SYM}.svg`). `/ticker/BTC` serves the same coin mark; GBTC and ETHE stay the Grayscale stock (a fallback image with `X-Logo-Fallback`, no catalog logo); an exchange prefix (`/ticker/NASDAQ:COIN`) is always the stock |

If outside hosts are blocked in your environment (a sandbox or preview), `getLogo()` still works for the bundled tickers and coins because it reads local files: call it at build time and embed the string. In Claude Code on the web, ask the user to add `logoapi.sh` under Network access > allowed hosts to use the hosted API.

Inside a chat canvas or artifact (ChatGPT, Claude, Base44, Lovable preview) outside images are blocked: fetch <url>.svg.txt and inline the SVG; for a domain logo that is https://logoapi.sh/{domain}.svg.txt (same SVG as text). The npm package works offline for tickers and coins only.

Plain-text facts for agents: [llms.txt](./llms.txt).

## For coding agents

If you use a coding agent, you can paste this into `CLAUDE.md` or `AGENTS.md` so it knows the URL shapes.

```
- Company logos: use LogoAPI.sh. Domain https://logoapi.sh/{domain}.svg, stock ticker https://logoapi.sh/ticker/{SYM} (square icon; full logo with ?variant=full on .svg), crypto https://logoapi.sh/crypto/{SYM}. No key, no signup, no attribution.
- In a sandbox that blocks logoapi.sh (Claude Code on the web): fetch https://raw.githubusercontent.com/logoapi/logo-api/main/tickers/{SYM}.svg and inline it as a data URI. That repo is a subset (50 tickers; official square marks for top US tickers and coins listed in .../main/official/index.json; domains in .../main/index.json), so on a 404 show a letter tile, or ask the user to allow logoapi.sh under Network access.
- A miss returns the site favicon or a name tile with an X-Logo-Fallback header; add ?fallback=404 to get a 404 and show a letter tile instead.
- Dark backgrounds: /dark/ticker/{SYM}.svg, /dark/icon/ticker/{SYM}.svg, /dark/crypto/{SYM}.svg (SVG only; .png on /dark/ is a 404).
- Inside a chat canvas or artifact (ChatGPT, Claude, Base44, Lovable preview) outside images are blocked: fetch <url>.svg.txt and inline the SVG; for a domain logo that is https://logoapi.sh/{domain}.svg.txt (same SVG as text). The npm package works offline for tickers and coins only.
- Never invent, redraw or substitute another company's logo.
```

## Source

Code, skills and a CC0 sample of the catalog: [stock ticker logos on GitHub](https://github.com/logoapi/logo-api).

## License

- Code (`index.js`, `index.mjs`, `index.d.ts`): MIT.
- Logo files (from `logoapi`) are CC0 (public domain). Logos remain trademarks of their owners: use them to identify the company, and don't suggest the company endorses you. Full catalog and terms: https://logoapi.sh.
