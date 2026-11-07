/** SVG markup for a bundled domain (apple.com, www.apple.com, https://apple.com) or ticker (AAPL, ETH). null if not bundled: this call never uses the network. */
export function getLogo(domainOrTicker: string): string | null;
/** Absolute path to the bundled SVG file, or null if not bundled. */
export function getLogoPath(domainOrTicker: string): string | null;
/** True if the package ships a logo file for this domain or ticker. */
export function hasLogo(domainOrTicker: string): boolean;
/** Every bundled domain and ticker, sorted. */
export function list(): { domains: string[]; tickers: string[] };

/** Hosted square-icon URL on logoapi.sh for any well-formed ticker, coin symbol or domain, bundled or not. null only for input that is not a ticker or a domain. Builds a string; no network. */
export function url(tickerOrDomain: string): string | null;
/** Same as url(): /ticker/{SYM}.svg for tickers and coins, /icon/{domain}.svg for domains. */
export function iconUrl(tickerOrDomain: string): string | null;
/** The dark-background version: /dark/ticker/{SYM}.svg or /dark/icon/{domain}.svg. */
export function darkUrl(tickerOrDomain: string): string | null;
/** 'https://logoapi.sh' */
export const HOST: string;

export interface LogoResult {
  /** The input item, echoed back as given. */
  ticker: string;
  /** `data:image/svg+xml;base64,...` for a bundled file; null when hosted or missing. */
  dataUri: string | null;
  /** Hosted logoapi.sh URL. Set for every well-formed ticker, coin or domain, bundled or not. */
  url: string | null;
  /** 'cc0' or 'official' for a bundled file, 'hosted' when only the URL is set, null when the input is not well formed. */
  source: 'cc0' | 'official' | 'hosted' | null;
  /** True only when the input is not a ticker, coin symbol or domain. */
  missing: boolean;
}
/** Batch lookup. Each item may be a ticker, a coin symbol or a domain, any case. Use `row.dataUri || row.url` as the image src. */
export function getLogos(list: string[]): LogoResult[];

declare const logoapi: {
  getLogo: typeof getLogo;
  getLogoPath: typeof getLogoPath;
  hasLogo: typeof hasLogo;
  list: typeof list;
  getLogos: typeof getLogos;
  url: typeof url;
  iconUrl: typeof iconUrl;
  darkUrl: typeof darkUrl;
  HOST: typeof HOST;
};
export default logoapi;
