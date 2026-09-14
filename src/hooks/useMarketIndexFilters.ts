"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { FILTER_NONE_SENTINEL } from "@/components/FilterMultiselectDropdown";
import {
  buildNetworkFilterOptions,
  filterBySelectedNetworks,
  type ChainLike,
  type NetworkFilterOption,
} from "@/utils/networkFilter";
import { partitionMarketsByArchived } from "@/utils/marketPartitions";

export type MarketIndexEntry = [string, unknown];

const getTupleMarket = <T extends MarketIndexEntry>(item: T): ChainLike =>
  item[1] as ChainLike;

export type UseMarketIndexFiltersOptions<T extends MarketIndexEntry> = {
  markets: T[];
  /** Defaults to reading chain info from the market object in the tuple. */
  getMarket?: (item: T) => ChainLike;
  /** Optional visibility gate applied after the network filter. */
  isVisible?: (market: T[1]) => boolean;
  /** When true, split into non-archived `displayedMarkets` and `archivedMarkets`. */
  partitionArchived?: boolean;
};

export type UseMarketIndexFiltersResult<T extends MarketIndexEntry> = {
  chainFilterSelected: string[];
  setChainFilterSelected: Dispatch<SetStateAction<string[]>>;
  clearChainFilter: () => void;
  chainOptions: NetworkFilterOption[];
  chainFilteredMarkets: T[];
  displayedMarkets: T[];
  archivedMarkets: T[];
};

/**
 * Shared network filter + optional archived partition for product index pages
 * (Sail, Earn/Anchor, Genesis).
 */
export function useMarketIndexFilters<T extends MarketIndexEntry>({
  markets,
  getMarket = getTupleMarket,
  isVisible,
  partitionArchived = false,
}: UseMarketIndexFiltersOptions<T>): UseMarketIndexFiltersResult<T> {
  const [chainFilterSelected, setChainFilterSelected] = useState<string[]>([]);

  const clearChainFilter = useCallback(() => {
    setChainFilterSelected([]);
  }, []);

  const chainOptions = useMemo(
    () => buildNetworkFilterOptions(markets, getMarket),
    [markets, getMarket]
  );

  const chainFilteredMarkets = useMemo(() => {
    if (chainFilterSelected.includes(FILTER_NONE_SENTINEL)) return [] as T[];
    if (chainFilterSelected.length === 0) return markets;
    return filterBySelectedNetworks(markets, chainFilterSelected, getMarket);
  }, [markets, chainFilterSelected, getMarket]);

  const visibilityFiltered = useMemo(() => {
    if (!isVisible) return chainFilteredMarkets;
    return chainFilteredMarkets.filter(([, m]) => isVisible(m));
  }, [chainFilteredMarkets, isVisible]);

  const { displayedMarkets, archivedMarkets } = useMemo(() => {
    if (!partitionArchived) {
      return {
        displayedMarkets: visibilityFiltered,
        archivedMarkets: [] as T[],
      };
    }
    const { active, archived } = partitionMarketsByArchived(visibilityFiltered);
    return { displayedMarkets: active, archivedMarkets: archived };
  }, [visibilityFiltered, partitionArchived]);

  return {
    chainFilterSelected,
    setChainFilterSelected,
    clearChainFilter,
    chainOptions,
    chainFilteredMarkets,
    displayedMarkets,
    archivedMarkets,
  };
}
