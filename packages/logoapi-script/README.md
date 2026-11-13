# logoapi-script

Stock and crypto logos for pages that can only load scripts from a CDN, such as sandboxed AI artifacts where `fetch()` and outside images are blocked. One script tag, then one `<span>` per ticker.

```html
<script src="https://cdn.jsdelivr.net/npm/logoapi-script@0.1.2/logo.js"></script>

<span data-ticker="AAPL"></span>
<span data-ticker="BTC" data-size="32"></span>
<span data-ticker="NVDA" data-theme="dark"></span>
```

The loader reads its own URL and loads one small script per ticker from the same version, for example `logoapi-script@0.1.2/t/AAPL.js` or `t/dark/AAPL.js`. Each file holds the original square SVG tile served by `https://logoapi.sh/ticker/AAPL.svg?shape=square` (dark: `/dark/ticker/...`), byte for byte. Tickers rendered later by React or other code are picked up too.

| Attribute | Default | Notes |
| --- | --- | --- |
| `data-ticker` | required | Stock, ETF or coin symbol, any case. `BRK.B`, `BRK-B` and `NASDAQ:AAPL` work. Put it on an empty element; one that holds anything else is left alone |
| `data-logoapi` | | Same as `data-ticker`, for pages that already use `data-ticker` for their own rows. Wins when both are set |
| `data-size` | `48` | Width and height in px |
| `data-theme` | `light` | `dark` for dark backgrounds. Set `data-theme="dark"` on the script tag to make dark the page default |

A ticker with no catalog logo in this version shows a letter tile. The loader never swaps in a logo from another source. `t/list.json` lists every ticker in the version.

Pin an exact version, as above. Logos added to the catalog later arrive in later versions.

Logos are trademarks of their owners. See https://logoapi.sh/terms. Code: MIT.
