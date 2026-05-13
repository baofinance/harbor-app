/**
 * MegaETH markets are configured when `NEXT_PUBLIC_USE_MEGAETH` is enabled.
 * They stay out of the Maiden Voyage (genesis index) product surface.
 */
export function isMegaethMaidenVoyageMarket(
  marketId: string,
  mkt: unknown
): boolean {
  if (typeof marketId === "string" && marketId.toLowerCase().includes("megaeth")) {
    return true;
  }
  if (!mkt || typeof mkt !== "object") return false;
  const o = mkt as {
    chainId?: number;
    chain?: { name?: string };
    marksCampaign?: { id?: string };
  };
  if (o.chainId === 4326) return true;
  const name = o.chain?.name;
  if (name === "MegaETH" || name === "Mega ETH") return true;
  if (o.marksCampaign?.id === "megaeth") return true;
  return false;
}
