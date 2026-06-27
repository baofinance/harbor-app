/** Deep-link to a Sail market on the index page (`useSailSelectedMarket` reads `?market=`). */
export function buildSailMarketPageHref(marketId?: string | null): string {
  if (!marketId) return "/sail";
  return `/sail?market=${encodeURIComponent(marketId)}`;
}
