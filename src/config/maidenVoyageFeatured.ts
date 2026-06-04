/** Featured Maiden Voyage 2.0 landing markets (Phase 1). */
export const FEATURED_ACTIVE_MARKET_IDS = [
  "steth-usd",
  "wsteth-usd-megaeth",
] as const;

/** @deprecated Prefer `FEATURED_ACTIVE_MARKET_IDS[0]` or selected featured id. */
export const FEATURED_ACTIVE_MARKET_ID = FEATURED_ACTIVE_MARKET_IDS[0];

export const FEATURED_COMPLETED_MARKET_IDS = [
  "eth-fxusd",
  "btc-fxusd",
  "btc-steth",
] as const;

export type FeaturedActiveMarketId =
  (typeof FEATURED_ACTIVE_MARKET_IDS)[number];

export type FeaturedCompletedMarketId =
  (typeof FEATURED_COMPLETED_MARKET_IDS)[number];

const FEATURED_COMPLETED_SET = new Set<string>(FEATURED_COMPLETED_MARKET_IDS);
const FEATURED_ACTIVE_SET = new Set<string>(FEATURED_ACTIVE_MARKET_IDS);

export function isFeaturedActiveMarket(marketId: string): boolean {
  return FEATURED_ACTIVE_SET.has(marketId);
}

export function isFeaturedCompletedMarket(marketId: string): boolean {
  return FEATURED_COMPLETED_SET.has(marketId);
}

export function isFeaturedMaidenVoyageMarket(marketId: string): boolean {
  return isFeaturedActiveMarket(marketId) || isFeaturedCompletedMarket(marketId);
}

/** Active featured ids that exist on the current genesis index (config + genesis address). */
export function resolveFeaturedActiveMarketIds(
  genesisMarketIds: readonly string[]
): FeaturedActiveMarketId[] {
  const available = new Set(genesisMarketIds);
  return FEATURED_ACTIVE_MARKET_IDS.filter((id) => available.has(id));
}

export function getNextFeaturedActiveMarketId(
  currentId: string,
  availableIds: readonly string[] = FEATURED_ACTIVE_MARKET_IDS
): string {
  if (availableIds.length === 0) return FEATURED_ACTIVE_MARKET_ID;
  if (availableIds.length === 1) return availableIds[0]!;
  const idx = availableIds.indexOf(currentId);
  const next = idx < 0 ? 0 : (idx + 1) % availableIds.length;
  return availableIds[next]!;
}

/** Voyage index for the active card (launch trio count + slot among active campaigns). */
export function getFeaturedVoyageNumber(marketId?: string): number {
  const base = FEATURED_COMPLETED_MARKET_IDS.length + 1;
  if (!marketId) return base;
  const idx = FEATURED_ACTIVE_MARKET_IDS.indexOf(
    marketId as FeaturedActiveMarketId
  );
  if (idx >= 0) return base + idx;
  return base;
}

export function getGenesisMarketTypeLabel(pegTarget?: string): string {
  if (!pegTarget) return "Market";
  if (pegTarget.toUpperCase() === "USD") return "USD Market";
  return `${pegTarget.toUpperCase()} Market`;
}

export const MAIDEN_VOYAGE_DOCS_URL =
  "https://docs.harborfinance.io/maiden-voyage";
