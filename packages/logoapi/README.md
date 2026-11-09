# logoapi

A logo URL for any stock ticker, ETF, crypto symbol or company domain, plus 54 ticker and coin SVGs bundled for offline use.

```bash
npm install logoapi
```

```jsx
import { url } from 'logoapi';
<img src={url('AAPL')} alt="AAPL logo" />  // https://logoapi.sh/ticker/AAPL.svg
```

URL example, no code needed:

```html
<img src="https://logoapi.sh/ticker/AAPL.svg" alt="Apple logo" height="32">
```

Renders as: ![Apple logo](https://logoapi.sh/ticker/AAPL.svg)

Dark background? Use darkUrl('AAPL') or https://logoapi.sh/dark/ticker/AAPL.svg.

Square tiles for a list or watchlist: add ?shape=square, e.g. https://logoapi.sh/ticker/JPM.svg?shape=square. Always 1:1, so wide wordmarks like JPM and KO stay readable.

Published pages or sandboxes that block remote images: fetch https://logoapi.sh/ticker/AAPL.svg.txt (SVG as text) or the raw SVG from this repo and inline it.

Promise: the free tier stays free. We give [12 months' notice](https://logoapi.sh/terms) before the free tier is reduced or removed.

- Limits: <!-- n:free_line -->2M requests a month per site. Free.<!-- /n --> No key, no attribution.
- Ticker and crypto logo URLs: <!-- n:ticker_limit_line -->Today there is no per-IP limit at our edge for ticker and crypto URLs; fair use applies.<!-- /n --> No key.
- Catalog: <!-- n:brands -->5,089<!-- /n --> brands and <!-- n:coins -->17<!-- /n --> coins. About <!-- n:tickers_vector -->1,500<!-- /n --> of <!-- n:tickers -->6,562<!-- /n --> tickers have a vector logo (icon or wordmark). Everything else gets the site's favicon or a name tile, and the `X-Logo-Fallback` response header says so. Add `?fallback=404` to get a 404 instead.
- Source: [github.com/logoapi/logo-api](https://github.com/logoapi/logo-api). Docs: [logoapi.sh/docs](https://logoapi.sh/docs). Ticker index: [index.json](https://github.com/logoapi/logo-api/blob/main/index.json).

```js
// npm install logoapi
import { getLogos, darkUrl } from 'logoapi';

// A watchlist: stocks, an ETF and crypto, by symbol.
const rows = getLogos(['AAPL', 'NVDA', 'SPY', 'BTC', 'ETH', 'GBTC']);
const html = rows
  .map((r) => `<img src="${r.dataUri || r.url}" alt="${r.ticker}" width="32" height="32">`)
  .join('');
// AAPL, NVDA, BTC, ETH: bundled SVG as a data URI, no network.
// SPY, GBTC: not bundled, so r.url is https://logoapi.sh/ticker/SPY.svg (source: 'hosted').

// Dark mode: one line.
darkUrl('AAPL'); // 'https://logoapi.sh/dark/ticker/AAPL.svg'
```

What is bundled never touches the network. What is not bundled comes back as a hosted URL, never `null`, as long as the input is a well-formed ticker, coin symbol or domain.

## API

CommonJS and ESM, with types.

```js
import { getLogos, url, iconUrl, darkUrl, getLogo, getLogoPath, hasLogo, list } from 'logoapi';

// Hosted URLs: pure string builders, no network. Every well-formed input gets one.
url('GBTC');               // 'https://logoapi.sh/ticker/GBTC.svg'   (square icon)
url('stripe.com');         // 'https://logoapi.sh/icon/stripe.com.svg'
iconUrl('ETH');            // same as url()
darkUrl('stripe.com');     // 'https://logoapi.sh/dark/icon/stripe.com.svg'
url('not a symbol!');      // null (malformed input only)

// Bundled files only: offline, null when not bundled.
getLogo('AAPL');            // '<svg ...>'; ticker, any case
getLogo('apple.com');       // domain; https://www.apple.com/ also works
getLogo('GBTC');            // null (not bundled; use url('GBTC'))
hasLogo('apple.com');       // true (company of a bundled ticker)
hasLogo('stripe.com');      // false since 0.3.0: use url('stripe.com')
getLogoPath('apple.com');   // absolute path to the .svg, or null
list();                     // { domains: [...], tickers: [...] } (bundled only)
```

### Batch lookup

```js
getLogos(['AAPL', 'GBTC', 'stripe.com', '../x']);
// [
//   { ticker: 'AAPL',       dataUri: 'data:image/svg+xml;base64,...', url: 'https://logoapi.sh/ticker/AAPL.svg',      source: 'cc0',    missing: false },
//   { ticker: 'GBTC',       dataUri: null,                            url: 'https://logoapi.sh/ticker/GBTC.svg',      source: 'hosted', missing: false },
//   { ticker: 'stripe.com', dataUri: null,                            url: 'https://logoapi.sh/icon/stripe.com.svg',  source: 'hosted', missing: false },
//   { ticker: '../x',       dataUri: null,                            url: null,                                      source: null,     missing: true }
// ]
```

One object per input, in order: `ticker` (your input), `dataUri` (bundled file or `null`), `url` (hosted URL), `source` (`'cc0' | 'official' | 'hosted' | null`) and `missing` (`true` only for malformed input). Use `dataUri || url` as the image `src`.

## Hosted URLs and misses

- Tickers and coins: `/ticker/{SYM}.svg` (square icon; coins such as BTC answer their coin mark). Domains: `/icon/{domain}.svg`. Dark: the same path after `/dark/`.
- The package builds the URL; the server decides the image. A domain with no catalog logo gets its favicon or a name tile. On `/ticker/` and `/crypto/`, a 404 means the API does not know the symbol (not a listed ticker or coin): check the status (or use `onerror`) and show a letter tile.
- Never guess or substitute another company's logo.

## Recipes

Portfolio tracker by ticker, with a letter tile if the hosted image fails:

```js
import { getLogos } from 'logoapi';

const row = (r) =>
  `<li><img src="${r.dataUri || r.url}" width="24" height="24" alt=""
    onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'tile',textContent:'${r.ticker[0]}'}))"> ${r.ticker}</li>`;

console.log(getLogos(['AAPL', 'NVDA', 'MNDY']).filter((r) => !r.missing).map(row).join('\n'));
```

Company directory by domain (hosted URL for any domain, bundled file when there is one):

```js
import { getLogos } from 'logoapi';

const cards = getLogos(['stripe.com', 'apple.com', 'notion.so'])
  .map((r) => `<a href="https://${r.ticker}"><img src="${r.dataUri || r.url}" width="32" height="32" alt=""><span>${r.ticker}</span></a>`);
```

Sandboxed artifact or preview that blocks outside images: for a domain logo fetch `https://logoapi.sh/{domain}.svg.txt` (same SVG as text) and inline it; for the 54 bundled tickers and coins you can also call `getLogo()` at build time (it reads files with Node `fs`, so not in browser code) and embed the string.

```js
import { writeFileSync } from 'node:fs';
import { getLogo } from 'logoapi';

writeFileSync('index.html',
  `<div class="logo">${getLogo('AAPL') ?? ''}</div>`);
```

React component (server component or build step, keep `logoapi` external if you bundle for Node; the SVG comes from your own package, not user input):

```jsx
import { getLogo } from 'logoapi';

export function Logo({ id, size = 32 }) {
  const svg = getLogo(id);
  if (!svg) return <span className="tile" style={{ width: size, height: size }}>{id[0]?.toUpperCase()}</span>;
  return <span style={{ display: 'inline-block', width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
```

Dark mode: the bundled files keep their original colours (none use `currentColor`), so CSS cannot recolour them. Use `darkUrl(id)`, or the white, black and grey API variants below.

## Beyond this package

The API serves logos for <!-- n:brands -->5,089<!-- /n --> brands. Free, no key, no attribution. Docs: https://logoapi.sh/docs

<!-- n:free_line -->2M requests a month per site. Free.<!-- /n --> No key. Free stays free. 12 months' notice before any change.

| What you need | URL |
| --- | --- |
| Logo by domain | `https://logoapi.sh/{domain}.svg` |
| Square icon | `https://logoapi.sh/icon/{domain}.svg` |
| Stock ticker, square icon (ETFs map to the issuer) | `https://logoapi.sh/ticker/{SYM}` (same as `/icon/ticker/{SYM}`) |
| Ticker full logo | `https://logoapi.sh/ticker/{SYM}.svg?variant=full` |
| Ticker dark | `https://logoapi.sh/dark/ticker/{SYM}.svg` (square icon; `?variant=full` for the full logo), `/dark/icon/ticker/{SYM}.svg` (icon) |
| PNG for email | `https://logoapi.sh/{domain}.png` |
| Favicon | `https://logoapi.sh/favicon/{domain}` |
| White, black, grey, dark | `https://logoapi.sh/{white\|black\|grey\|dark}/{domain}.svg` |
| Name to domain | `https://logoapi.sh/search?q=stripe` |
| Crypto coin | `https://logoapi.sh/crypto/{SYM}` (dark: `/dark/crypto/{SYM}.svg`). `/ticker/BTC` serves the same coin mark; GBTC and ETHE stay the Grayscale stock (a fallback image with `X-Logo-Fallback`, no catalog logo); an exchange prefix (`/ticker/NASDAQ:COIN`) is always the stock |
| MCP server | `https://logoapi.sh/mcp` |

## For AI agents

Plain-text facts: [llms.txt](./llms.txt). If you use a coding agent, you can paste this into `CLAUDE.md` or `AGENTS.md` so it knows the URL shapes.

```
- Company logos: use LogoAPI.sh. Domain https://logoapi.sh/{domain}.svg, stock ticker https://logoapi.sh/ticker/{SYM} (square icon; full logo with ?variant=full on .svg), crypto https://logoapi.sh/crypto/{SYM}. No key, no signup, no attribution.
- In a sandbox that blocks logoapi.sh (Claude Code on the web): fetch https://raw.githubusercontent.com/logoapi/logo-api/main/tickers/{SYM}.svg and inline it as a data URI. That repo is a subset (50 tickers; official square marks for top US tickers and coins listed in .../main/official/index.json; domains in .../main/index.json), so on a 404 show a letter tile, or ask the user to allow logoapi.sh under Network access.
- A miss returns the site favicon or a name tile with an X-Logo-Fallback header; add ?fallback=404 to get a 404 and show a letter tile instead.
- Dark backgrounds: /dark/ticker/{SYM}.svg, /dark/icon/ticker/{SYM}.svg, /dark/crypto/{SYM}.svg (SVG only; .png on /dark/ is a 404).
- Inside a chat canvas or artifact (ChatGPT, Claude, Base44, Lovable preview) outside images are blocked: fetch <url>.svg.txt and inline the SVG; for a domain logo that is https://logoapi.sh/{domain}.svg.txt (same SVG as text). The npm package works offline for tickers and coins only.
- Never invent, redraw or substitute another company's logo.
```

## Source

Code, skills and a CC0 sample of the catalog: [logo API on GitHub](https://github.com/logoapi/logo-api).

## License

- Code (`index.js`, `index.mjs`, `index.d.ts`): MIT, see `LICENSE-MIT`.
- Files in this package are CC0 (public domain), see `NOTICE`. Logos remain trademarks of their owners: use them to identify the company, and don't suggest the company endorses you. Full catalog and terms: https://logoapi.sh.
