/** SVG markup for a bundled coin symbol (BTC), else a bundled CC0 domain or ticker from logoapi. null if not bundled: this call never uses the network. */
export function getLogo(symbolDomainOrTicker: string): string | null;
/** Absolute path to the SVG file, or null. */
export function getLogoPath(symbolDomainOrTicker: string): string | null;
/** True if the package ships a logo for this input. */
export function hasLogo(symbolDomainOrTicker: string): boolean;
/** Every coin, domain and ticker the package covers, sorted. */
export function list(): { crypto: string[]; domains: string[]; tickers: string[] };

/** Hosted URL for any well-formed coin, ticker or domain: /crypto/{SYM}.svg for coins the API knows, else /ticker/{SYM}.svg or /icon/{domain}.svg. null only for malformed input. Builds a string; no network. */
export function url(symbolDomainOrTicker: string): string | null;
/** Same as url(). */
export function iconUrl(symbolDomainOrTicker: string): string | null;
/** The dark-background version: /dark/crypto/{SYM}.svg, /dark/ticker/{SYM}.svg or /dark/icon/{domain}.svg. */
export function darkUrl(symbolDomainOrTicker: string): string | null;
/** 'https://logoapi.sh' */
export const HOST: string;

export interface LogoResult {
  /** The input item, echoed back as given. */
  ticker: string;
  /** `data:image/svg+xml;base64,...` for a bundled file; null when hosted or missing. */
  dataUri: string | null;
  /** Hosted logoapi.sh URL. Set for every well-formed coin, ticker or domain, bundled or not. */
  url: string | null;
  /** 'official' for bundled coin marks, 'cc0' for bundled logoapi files, 'hosted' when only the URL is set, null for malformed input. */
  source: 'cc0' | 'official' | 'hosted' | null;
  /** True only when the input is not a coin, ticker or domain. */
  missing: boolean;
}
/** Batch lookup. Bundled coins come back with source 'official'. Use `row.dataUri || row.url` as the image src. */
export function getLogos(list: string[]): LogoResult[];

declare const cryptoLogos: {
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
export default cryptoLogos;
