import type * as React from 'react';

type ImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'alt'>;

export interface StockLogoProps extends ImgProps {
  /** Stock ticker, ETF ticker or crypto coin symbol, any case: AAPL, VOO, BTC. */
  ticker: string;
  /** 'dark' for dark backgrounds. Default 'light'. */
  theme?: 'light' | 'dark';
  /** 'square' gives an always 1:1 tile, good for lists and watchlists. */
  shape?: 'square';
  /** Width and height in px. Default 32. */
  size?: number;
  /** Default: "{TICKER} logo". */
  alt?: string;
  /** Optional company domain. If the logo fails to load, its favicon is shown. */
  domain?: string;
}

export interface CompanyLogoProps extends ImgProps {
  /** Company domain: stripe.com. A www. prefix or https:// is fine. */
  domain: string;
  theme?: 'light' | 'dark';
  size?: number;
  /** Default: "{domain} logo". */
  alt?: string;
}

export function StockLogo(props: StockLogoProps): React.ReactElement;
export function CompanyLogo(props: CompanyLogoProps): React.ReactElement;
/** Hosted URL on logoapi.sh for a ticker or domain. null if the input is not well formed. */
export function srcFor(tickerOrDomain: string, theme?: 'light' | 'dark', square?: boolean): string | null;
/** https://logoapi.sh/favicon/{domain}, or null for empty input. */
export function faviconUrl(domain: string): string | null;
export const HOST: string;
declare const _default: { StockLogo: typeof StockLogo; CompanyLogo: typeof CompanyLogo; srcFor: typeof srcFor; faviconUrl: typeof faviconUrl; HOST: string };
export default _default;
