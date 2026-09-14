"use client";

import { useCallback, useMemo, useState } from "react";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useSailContractReads } from "@/hooks/useSailContractReads";
import { useSailWalletEnrichment } from "@/hooks/useSailWalletEnrichment";
import { useMarketIndexFilters } from "@/hooks/useMarketIndexFilters";
import type { SailMarketTuple } from "@/types/sail";
import {
  filterSailActiveMarkets,
  filterSailTableMarkets,
} from "@/utils/sailActiveMarkets";
import { isSailActiveForExtendedUi } from "@/config/markets";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";

/**
 * Sail index route: filters, shell reads, wallet enrichment, derived markets.
 * UI-only state (modal, expanded rows, layout toggle) stays in `page.tsx`.
 */
export function useSailPageData() {
  const { address, isConnected } = useHarborAccount();

  const [longFilterSelected, setLongFilterSelected] = useState<string[]>([]);
  const [shortFilterSelected, setShortFilterSelected] = useState<string[]>([]);

  const {
    sailMarkets,
    sailMarketIdToIndex,
    reads,
    isLoadingReads,
    isReadsError,
    refetchReads,
    marketOffsets,
    minterConfigByMarketId,
    rebalanceThresholdByMarketId,
    refetchMinterConfigs,
    refetchRebalanceReads,
    tokenPricesByMarket,
    userDepositMap,
    refetchUserDeposits,
  } = useSailContractReads();

  const {
    chainFilterSelected,
    setChainFilterSelected,
    clearChainFilter,
    chainOptions: sailChainOptions,
    displayedMarkets: displayedSailMarkets,
    archivedMarkets: displayedArchivedSailMarkets,
  } = useMarketIndexFilters({
    markets: sailMarkets,
    isVisible: isSailActiveForExtendedUi,
    partitionArchived: true,
  });

  const clearFilters = useCallback(() => {
    setLongFilterSelected([]);
    setShortFilterSelected([]);
    clearChainFilter();
  }, [clearChainFilter]);

  const {
    totalSailMarks,
    sailMarksPerDay,
    isLoadingSailMarks,
    sailMarksError,
    activeSailBoostEndTimestamp,
    sailUserStats,
    sailPnLSummary,
    positionsPnLLoading,
    pnlFromMarkets,
    marketDropdownPositionByMarketId,
    marketDropdownPnLToneByMarketId,
  } = useSailWalletEnrichment({
    isConnected,
    address,
    sailMarkets,
    sailMarketIdToIndex,
    reads,
    marketOffsets,
    tokenPricesByMarket,
    userDepositMap,
  });

  const uniqueLongSides = useMemo(() => {
    const sides = new Set<string>();
    displayedSailMarkets.forEach(([_, m]) => {
      sides.add(getLongSide(m));
    });
    return Array.from(sides)
      .filter((s) => s.toLowerCase() !== "usd")
      .sort();
  }, [displayedSailMarkets]);

  const uniqueShortSides = useMemo(() => {
    const sides = new Set<string>();
    displayedSailMarkets.forEach(([_, m]) => {
      sides.add(getShortSide(m));
    });
    const exclude = new Set(["mcap", "wsteth"]);
    return Array.from(sides)
      .filter((s) => !exclude.has(s.toLowerCase()))
      .sort();
  }, [displayedSailMarkets]);

  const activeMarkets = useMemo((): SailMarketTuple[] => {
    if (!reads) return [];
    return filterSailActiveMarkets(
      displayedSailMarkets,
      sailMarketIdToIndex,
      marketOffsets,
      reads,
      longFilterSelected,
      shortFilterSelected
    );
  }, [
    displayedSailMarkets,
    longFilterSelected,
    shortFilterSelected,
    reads,
    marketOffsets,
    sailMarketIdToIndex,
  ]);

  const tableMarkets = useMemo((): SailMarketTuple[] => {
    return filterSailTableMarkets(
      displayedSailMarkets,
      sailMarketIdToIndex,
      marketOffsets,
      reads,
      longFilterSelected,
      shortFilterSelected
    );
  }, [
    displayedSailMarkets,
    longFilterSelected,
    shortFilterSelected,
    reads,
    marketOffsets,
    sailMarketIdToIndex,
  ]);

  return {
    address,
    isConnected,
    longFilterSelected,
    setLongFilterSelected,
    shortFilterSelected,
    setShortFilterSelected,
    chainFilterSelected,
    setChainFilterSelected,
    clearFilters,
    sailPnLSummary,
    totalSailMarks,
    sailMarksPerDay,
    isLoadingSailMarks,
    sailMarksError,
    sailMarkets,
    sailMarketIdToIndex,
    displayedSailMarkets,
    displayedArchivedSailMarkets,
    sailChainOptions,
    uniqueLongSides,
    uniqueShortSides,
    reads,
    isLoadingReads,
    isReadsError,
    refetchReads,
    marketOffsets,
    minterConfigByMarketId,
    rebalanceThresholdByMarketId,
    refetchMinterConfigs,
    refetchRebalanceReads,
    tokenPricesByMarket,
    userDepositMap,
    refetchUserDeposits,
    sailUserStats,
    pnlFromMarkets,
    positionsPnLLoading,
    marketDropdownPnLToneByMarketId,
    marketDropdownPositionByMarketId,
    activeSailBoostEndTimestamp,
    activeMarkets,
    tableMarkets,
  };
}
