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

function getCollateralReadSlot(
  id: string,
  sailMarketIdToIndex: Map<string, number>,
  marketOffsets: Map<number, number>,
  reads: SailContractReads
): { result?: bigint; status?: string; error?: unknown } | undefined {
  const globalIndex = sailMarketIdToIndex.get(id);
  if (globalIndex === undefined) return undefined;
  const baseOffset = marketOffsets.get(globalIndex) ?? 0;
  return reads?.[baseOffset + 3] as
    | { result?: bigint; status?: string; error?: unknown }
    | undefined;
}

/**
 * Include a live market unless collateral was successfully read as 0n.
 * Failed / missing slots (allowFailure) are treated as unknown — keep the market.
 */
function includeLiveMarketByCollateral(
  id: string,
  sailMarketIdToIndex: Map<string, number>,
  marketOffsets: Map<number, number>,
  reads: SailContractReads
): boolean {
  const readSlot = getCollateralReadSlot(
    id,
    sailMarketIdToIndex,
    marketOffsets,
    reads
  );
  if (!readSlot || typeof readSlot !== "object") return true;
  if (readSlot.status === "failure") return true;

  const collateralValue = readSlot.result;
  if (collateralValue === undefined) return true;
  return collateralValue > 0n;
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
    return includeLiveMarketByCollateral(
      id,
      sailMarketIdToIndex,
      marketOffsets,
      reads
    );
  });
}

/**
 * UI+ extended table: live (collateral > 0), preview (`soon`), and deprecated metals rows.
 * Before reads resolve, keep non-soon markets in the list so selection can prefer a live
 * provisional market instead of locking onto coming-soon.
 * With reads, exclude live markets only when collateral successfully reads as 0n;
 * failed/unavailable slots keep the market (see allowFailure on useSailContractReads).
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
    if (!reads) return true;
    return includeLiveMarketByCollateral(
      id,
      sailMarketIdToIndex,
      marketOffsets,
      reads
    );
  });
}
