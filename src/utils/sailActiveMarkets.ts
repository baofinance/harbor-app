import type { SailContractReads, SailMarketTuple } from "@/types/sail";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";

export type { SailMarketTuple };

/**
 * Markets shown in the leverage table with collateral & optional long/short filters applied.
 * Pure helper — mirrors `activeMarkets` in `useSailPageData` for testing and reuse.
 */
export function filterSailActiveMarkets(
  displayedSailMarkets: SailMarketTuple[],
  sailMarketIdToIndex: Map<string, number>,
  marketOffsets: Map<number, number>,
  reads: SailContractReads,
  longFilterSelected: string[],
  shortFilterSelected: string[]
): SailMarketTuple[] {
  return displayedSailMarkets.filter(([id, m]) => {
    const globalIndex = sailMarketIdToIndex.get(id);
    if (globalIndex === undefined) return false;
    const baseOffset = marketOffsets.get(globalIndex) ?? 0;
    const readSlot = reads?.[baseOffset + 3] as
      | { result?: bigint }
      | undefined;
    const collateralValue = readSlot?.result;

    if (longFilterSelected.length > 0) {
      const longSide = getLongSide(m);
      if (!longFilterSelected.includes(longSide)) return false;
    }
    if (shortFilterSelected.length > 0) {
      const shortSide = getShortSide(m);
      if (!shortFilterSelected.includes(shortSide)) return false;
    }

    return collateralValue !== undefined && collateralValue > 0n;
  });
}
