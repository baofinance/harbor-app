/** Featured Maiden Voyage 2.0 landing markets (Phase 1). */
export const FEATURED_ACTIVE_MARKET_ID = "steth-usd" as const;

export const FEATURED_COMPLETED_MARKET_IDS = [
  "eth-fxusd",
  "btc-fxusd",
  "btc-steth",
] as const;

export type FeaturedCompletedMarketId =
  (typeof FEATURED_COMPLETED_MARKET_IDS)[number];

const FEATURED_COMPLETED_SET = new Set<string>(FEATURED_COMPLETED_MARKET_IDS);

export function isFeaturedActiveMarket(marketId: string): boolean {
  return marketId === FEATURED_ACTIVE_MARKET_ID;
}

export function isFeaturedCompletedMarket(marketId: string): boolean {
  return FEATURED_COMPLETED_SET.has(marketId);
}

export function isFeaturedMaidenVoyageMarket(marketId: string): boolean {
  return isFeaturedActiveMarket(marketId) || isFeaturedCompletedMarket(marketId);
}

/** Voyage index for the active card (launch trio count + 1). */
export function getFeaturedVoyageNumber(_marketId?: string): number {
  return FEATURED_COMPLETED_MARKET_IDS.length + 1;
}

export function getGenesisMarketTypeLabel(pegTarget?: string): string {
  if (!pegTarget) return "Market";
  if (pegTarget.toUpperCase() === "USD") return "USD Market";
  return `${pegTarget.toUpperCase()} Market`;
}

export const MAIDEN_VOYAGE_DOCS_URL =
  "https://docs.harborfinance.io/maiden-voyage";
