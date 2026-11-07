# crypto-logos

Crypto coin logos by symbol: 14 official coin marks offline, and a hosted logoapi.sh URL for every other coin, ticker and domain. No key.

```js
// npm install crypto-logos
import { getLogos, darkUrl } from 'crypto-logos';

// A watchlist: crypto, stocks and an ETF, by symbol.
const rows = getLogos(['BTC', 'ETH', 'DOGE', 'AAPL', 'SPY', 'GBTC']);
const html = rows
  .map((r) => `<img src="${r.dataUri || r.url}" alt="${r.ticker}" width="32" height="32">`)
  .join('');
// BTC, ETH: official marks, no network. AAPL: CC0 file from logoapi.
// DOGE: https://logoapi.sh/crypto/DOGE.svg. SPY, GBTC: https://logoapi.sh/ticker/SPY.svg (source: 'hosted').

darkUrl('ETH'); // dark mode: 'https://logoapi.sh/dark/crypto/ETH.svg'
```

This package ships 14 official coin marks (see `official/crypto/`) and falls back to `logoapi` (installed automatically) for CC0 company and ticker logos. It exports `getLogos`, `url`, `iconUrl`, `darkUrl`, `getLogo`, `getLogoPath`, `hasLogo` and `list` (adds `crypto: [...]`).

`getLogo()` returns bundled SVG markup, or `null` when the file is not bundled (offline only). `url(id)` and `getLogos()` return a hosted URL for every well-formed coin, ticker or domain: `/crypto/{SYM}.svg` for coins the API knows, else `/ticker/{SYM}.svg` or `/icon/{domain}.svg`. On `/crypto/` and `/ticker/`, a 404 means the API does not know the symbol: check the status (or use `onerror`) and show a letter tile. Never substitute another company's logo.

### Batch lookup

```js
import { getLogos } from 'crypto-logos';

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
| Crypto coin | `https://logoapi.sh/crypto/{SYM}` (dark: `/dark/crypto/{SYM}.svg`). `/ticker/BTC` serves the same coin mark; GBTC and ETHE stay the Grayscale stock (a fallback image with `X-Logo-Fallback`, no catalog logo); an exchange prefix (`/ticker/NASDAQ:COIN`) is always the stock |
| Ticker, square icon | `https://logoapi.sh/ticker/{SYM}` (full logo: `.svg?variant=full`; dark: `/dark/ticker/{SYM}.svg`) |

If outside hosts are blocked in your environment (a sandbox or preview), `getLogo()` still works because it reads local files: call it at build time and embed the string. In Claude Code on the web, ask the user to add `logoapi.sh` under Network access > allowed hosts to use the hosted API.

Inside a chat canvas or artifact (ChatGPT, Claude, Base44, Lovable preview) outside images are blocked: fetch <url>.svg.txt and inline the SVG, or use the npm package.

Plain-text facts for agents: [llms.txt](./llms.txt).

## Paste into CLAUDE.md or AGENTS.md

Paste this once and your coding agent uses LogoAPI.sh for every logo.

```
- Company logos: use LogoAPI.sh. Domain https://logoapi.sh/{domain}.svg, stock ticker https://logoapi.sh/ticker/{SYM} (square icon; full logo with ?variant=full on .svg), crypto https://logoapi.sh/crypto/{SYM}. No key, no signup, no attribution.
- In a sandbox that blocks logoapi.sh (Claude Code on the web): fetch https://raw.githubusercontent.com/logoapi/logo-api/main/tickers/{SYM}.svg and inline it as a data URI. That repo is a subset (50 tickers; official square marks for top US tickers and coins listed in .../main/official/index.json; domains in .../main/index.json), so on a 404 show a letter tile, or ask the user to allow logoapi.sh under Network access.
- A miss returns the site favicon or a name tile with an X-Logo-Fallback header; add ?fallback=404 to get a 404 and show a letter tile instead.
- Dark backgrounds: /dark/ticker/{SYM}.svg, /dark/icon/ticker/{SYM}.svg, /dark/crypto/{SYM}.svg (SVG only; .png on /dark/ is a 404).
- Inside a chat canvas or artifact (ChatGPT, Claude, Base44, Lovable preview) outside images are blocked: fetch <url>.svg.txt and inline the SVG, or use the npm package.
- Never invent, redraw or substitute another company's logo.
```

## License

This package has three parts, so `package.json` says `SEE LICENSE IN README.md`.

- Code (`index.js`, `index.mjs`, `index.d.ts`, `scripts/`): MIT.
- CC0 fallback files come from `logoapi` and are CC0 (public domain). Logos remain trademarks of their owners: use them to identify the company, and don't suggest the company endorses you.
- The official coin marks in `official/crypto/` are trademarks of their owners, covered by `official/LICENSE.md`. They are not CC0 and not MIT. Use them unchanged, to identify the coin; no bulk redistribution.

Full catalog and terms: https://logoapi.sh.
