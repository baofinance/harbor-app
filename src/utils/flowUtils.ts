/**
 * Utility functions for the Flow/Map Room page
 */

import { getBlockExplorerAddressUrl } from "@/config/blockExplorers";

export function formatHeartbeat(value?: bigint): string {
  if (value === undefined) return "-";
  const seconds = Number(value);
  if (seconds <= 60) return `${seconds}s`;
  if (seconds <= 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds <= 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

export function getTokenFullName(symbol: string): string {
  const tokenNames: Record<string, string> = {
    ETH: "Ethereum",
    BTC: "Bitcoin",
    USD: "US Dollar",
    EUR: "Euro",
    GOLD: "Gold",
    SILVER: "Silver",
    MCAP: "Market Cap",
    AAPL: "Apple",
    AMZN: "Amazon",
    GOOGL: "Google",
    META: "Meta",
    MSFT: "Microsoft",
    NVDA: "NVIDIA",
    SPY: "S&P 500",
    TSLA: "Tesla",
    MAG7: "Magnificent 7",
    BOM5: "Bag of Memes",
    fxUSD: "fxUSD",
    stETH: "Lido Staked Ether",
    USDE: "Ethena USDe",
    Shib: "Shiba Inu",
    Doge: "Dogecoin",
    PEPE: "Pepe",
    TRUMP: "Trump",
    WIF: "dogwifhat",
  };
  return tokenNames[symbol.toUpperCase()] || symbol;
}

const NETWORK_CHAIN_IDS: Record<string, number> = {
  mainnet: 1,
  arbitrum: 42161,
  base: 8453,
  megaeth: 4326,
};

/** Explorer address URL for a network (mainnet, arbitrum, base, megaeth). */
export function getExplorerUrl(
  address: string,
  network: "mainnet" | "arbitrum" | "base" | "megaeth"
): string | undefined {
  if (!address) return undefined;
  const chainId = NETWORK_CHAIN_IDS[network] ?? 1;
  return getBlockExplorerAddressUrl(address, chainId);
}

/** @deprecated Use getBlockExplorerAddressUrl from @/config/blockExplorers */
export function etherscanAddressUrl(
  address?: `0x${string}` | string
): string | undefined {
  if (!address) return undefined;
  return getBlockExplorerAddressUrl(address, 1);
}

/** @deprecated Use getBlockExplorerAddressUrl from @/config/blockExplorers */
export function arbitrumAddressUrl(
  address?: `0x${string}` | string
): string | undefined {
  if (!address) return undefined;
  return getBlockExplorerAddressUrl(address, 42161);
}

/** @deprecated Use getBlockExplorerAddressUrl from @/config/blockExplorers */
export function baseAddressUrl(
  address?: `0x${string}` | string
): string | undefined {
  if (!address) return undefined;
  return getBlockExplorerAddressUrl(address, 8453);
}

