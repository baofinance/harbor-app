/**
 * Maps feed labels to market IDs for navigation
 * Active feeds correspond to live markets that can be accessed via Anchor/Sail pages
 */
export function getMarketIdFromFeedLabel(label: string): string | null {
  const normalized = label.toLowerCase().trim();
  
  // Map feed labels to market IDs
  const mapping: Record<string, string> = {
    "fxusd/eth": "eth-fxusd",
    "fxusd/btc": "btc-fxusd",
    "steth/btc": "btc-steth",
  };
  
  return mapping[normalized] || null;
}

/**
 * Check if a feed has an active market (both Anchor and Sail available)
 */
export function hasActiveMarket(feedLabel: string): boolean {
  return getMarketIdFromFeedLabel(feedLabel) !== null;
}
