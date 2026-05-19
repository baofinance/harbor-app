import type { SailContractReads, SailMarketTuple } from "@/types/sail";
import { isSailDeprecatedExtendedUi, isSailSoonUi } from "@/config/markets";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";

export type { SailMarketTuple };

function passesSideFilters(
  m: SailMarketTuple[1],
  longFilterSelected: string[],
  shortFilterSelected: string[]
): boolean {
  if (longFilterSelected.length > 0) {
    const longSide = getLongSide(m);
    if (!longFilterSelected.includes(longSide)) return false;
  }
  if (shortFilterSelected.length > 0) {
    const shortSide = getShortSide(m);
    if (!shortFilterSelected.includes(shortSide)) return false;
  }
  return true;
}

function hasLiveCollateral(
  id: string,
  sailMarketIdToIndex: Map<string, number>,
  marketOffsets: Map<number, number>,
  reads: SailContractReads
): boolean {
  const globalIndex = sailMarketIdToIndex.get(id);
  if (globalIndex === undefined) return false;
  const baseOffset = marketOffsets.get(globalIndex) ?? 0;
  const readSlot = reads?.[baseOffset + 3] as { result?: bigint } | undefined;
  const collateralValue = readSlot?.result;
  return collateralValue !== undefined && collateralValue > 0n;
}

/**
 * Markets shown in the leverage table with collateral & optional long/short filters applied.
 * Live markets require on-chain collateral; preview (`sailActive: "soon"`) rows do not.
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
    if (!passesSideFilters(m, longFilterSelected, shortFilterSelected)) {
      return false;
    }
    if (isSailSoonUi(m)) return true;
    return hasLiveCollateral(id, sailMarketIdToIndex, marketOffsets, reads);
  });
}

/**
 * UI+ extended table: live (collateral > 0), preview (`soon`), and deprecated metals rows.
 */
export function filterSailTableMarkets(
  displayedSailMarkets: SailMarketTuple[],
  sailMarketIdToIndex: Map<string, number>,
  marketOffsets: Map<number, number>,
  reads: SailContractReads | undefined,
  longFilterSelected: string[],
  shortFilterSelected: string[]
): SailMarketTuple[] {
  return displayedSailMarkets.filter(([id, m]) => {
    if (!passesSideFilters(m, longFilterSelected, shortFilterSelected)) {
      return false;
    }
    if (isSailSoonUi(m)) return true;
    if (isSailDeprecatedExtendedUi(m)) return true;
    if (!reads) return false;
    return hasLiveCollateral(id, sailMarketIdToIndex, marketOffsets, reads);
  });
}
