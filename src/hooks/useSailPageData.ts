"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { useMarketBoostWindows } from "@/hooks/useMarketBoostWindows";
import { useSailContractReads } from "@/hooks/useSailContractReads";
import { useSailPositionsPnLSummary } from "@/hooks/useSailPositionsPnLSummary";
import { getSailPriceGraphUrlOptional, getGraphHeaders } from "@/config/graph";
import { FILTER_NONE_SENTINEL } from "@/components/FilterMultiselectDropdown";
import { getWeb3iconsNetworkId } from "@/config/web3iconsNetworks";
import { filterSailActiveMarkets } from "@/utils/sailActiveMarkets";
import { getLongSide, getShortSide } from "@/utils/marketSideLabels";

/**
 * Sail index route: filters, subgraph marks/PnL, aggregates, and derived `activeMarkets`.
 * On-chain reads live in `useSailContractReads`.
 * UI-only state (modal, expanded rows, layout toggle) stays in `page.tsx`.
 */
export function useSailPageData() {
  const { address, isConnected } = useAccount();

  const [longFilterSelected, setLongFilterSelected] = useState<string[]>([]);
  const [shortFilterSelected, setShortFilterSelected] = useState<string[]>([]);
  const [chainFilterSelected, setChainFilterSelected] = useState<string[]>([]);

  const clearFilters = useCallback(() => {
    setLongFilterSelected([]);
    setShortFilterSelected([]);
    setChainFilterSelected([]);
  }, []);

  const sailPnLSummary = useSailPositionsPnLSummary(isConnected);

  const {
    sailBalances,
    loading: isLoadingSailMarks,
    error: sailMarksError,
  } = useAnchorLedgerMarks({ enabled: true });

  const [totalSailMarksState, setTotalSailMarksState] = useState(0);

  useEffect(() => {
    if (!sailBalances || sailBalances.length === 0) {
      setTotalSailMarksState(0);
      if (process.env.NODE_ENV === "development") {
        console.log("[Sail Page] No sail balances, setting to 0");
      }
      return;
    }

    const totalMarks = sailBalances.reduce(
      (sum: number, balance: { estimatedMarks: number }) =>
        sum + balance.estimatedMarks,
      0
    );

    if (process.env.NODE_ENV === "development") {
      console.log("[Sail Page] Updating totalSailMarksState", {
        totalMarks,
        sailBalancesCount: sailBalances.length,
        sailBalances: sailBalances.map(
          (b: { tokenAddress: string; estimatedMarks: number }) => ({
            token: b.tokenAddress,
            marks: b.estimatedMarks,
          })
        ),
      });
    }

    setTotalSailMarksState(totalMarks);
  }, [sailBalances]);

  const { totalSailMarks, sailMarksPerDay } = useMemo(() => {
    if (!sailBalances || sailBalances.length === 0) {
      return { totalSailMarks: 0, sailMarksPerDay: 0 };
    }

    const totalMarks = totalSailMarksState;
    const totalPerDay = sailBalances.reduce(
      (sum: number, balance: { marksPerDay: number }) =>
        sum + balance.marksPerDay,
      0
    );

    return {
      totalSailMarks: totalMarks,
      sailMarksPerDay: totalPerDay,
    };
  }, [totalSailMarksState, sailBalances]);

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

  const displayedSailMarkets = useMemo(
    () =>
      chainFilterSelected.includes(FILTER_NONE_SENTINEL)
        ? []
        : chainFilterSelected.length === 0
          ? sailMarkets
          : sailMarkets.filter(([, m]) => {
              const chainName = (m as { chain?: { name?: string } }).chain
                ?.name || "Ethereum";
              return chainFilterSelected.includes(chainName);
            }),
    [sailMarkets, chainFilterSelected]
  );

  const sailChainOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: {
      id: string;
      label: string;
      iconUrl?: string;
      networkId?: string;
    }[] = [];
    sailMarkets.forEach(([, m]) => {
      const name =
        (m as { chain?: { name?: string; logo?: string } }).chain?.name ||
        "Ethereum";
      if (seen.has(name)) return;
      seen.add(name);
      const logo =
        (m as { chain?: { logo?: string } }).chain?.logo || "icons/eth.png";
      const networkId = getWeb3iconsNetworkId(name);
      options.push({
        id: name,
        label: name,
        iconUrl: networkId
          ? undefined
          : logo.startsWith("/")
            ? logo
            : `/${logo}`,
        networkId,
      });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [sailMarkets]);

  const sailBoostIds = useMemo(() => {
    const ids: string[] = [];
    for (const [, market] of sailMarkets) {
      const leveragedTokenAddress = (
        market as { addresses?: { leveragedToken?: string } }
      )?.addresses?.leveragedToken as string | undefined;
      if (leveragedTokenAddress) {
        ids.push(`sailToken-${leveragedTokenAddress.toLowerCase()}`);
      }
    }
    return Array.from(new Set(ids)).filter((id) => id.includes("0x"));
  }, [sailMarkets]);

  const { data: sailBoostWindowsData } = useMarketBoostWindows({
    enabled: sailBoostIds.length > 0,
    ids: sailBoostIds,
    first: 250,
  });

  const activeSailBoostEndTimestamp = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const windows = sailBoostWindowsData?.marketBoostWindows ?? [];
    const activeEnds = windows
      .filter((w) => w.sourceType === "sailToken")
      .filter((w) => Number(w.boostMultiplier) >= 2)
      .filter(
        (w) =>
          nowSec >= Number(w.startTimestamp) && nowSec < Number(w.endTimestamp)
      )
      .map((w) => Number(w.endTimestamp));

    return activeEnds.length ? Math.min(...activeEnds) : null;
  }, [sailBoostWindowsData]);

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

  const sailUserStats = useMemo(() => {
    let totalPositionsUSD = 0;
    let weightedLeverageSum = 0;
    let positionsCount = 0;

    sailMarkets.forEach(([id], marketIndex) => {
      const userDeposit = userDepositMap.get(marketIndex);
      if (!userDeposit || userDeposit <= 0n) return;

      const baseOffset = marketOffsets.get(marketIndex) ?? 0;
      const leverageRatio = reads?.[baseOffset]?.result as bigint | undefined;
      const leverage = leverageRatio ? Number(leverageRatio) / 1e18 : 0;

      const tokenPrices = tokenPricesByMarket[id];
      const priceUSD = tokenPrices?.leveragedPriceUSD ?? 0;
      if (!priceUSD || priceUSD <= 0) return;

      const valueUSD = (Number(userDeposit) / 1e18) * priceUSD;
      if (!Number.isFinite(valueUSD) || valueUSD <= 0) return;

      positionsCount += 1;
      totalPositionsUSD += valueUSD;
      weightedLeverageSum += valueUSD * leverage;
    });

    const averageLeverage =
      totalPositionsUSD > 0 ? weightedLeverageSum / totalPositionsUSD : 0;

    return { totalPositionsUSD, averageLeverage, positionsCount };
  }, [sailMarkets, userDepositMap, marketOffsets, reads, tokenPricesByMarket]);

  const graphUrl = getSailPriceGraphUrlOptional();
  const { data: positionsData } = useQuery({
    queryKey: ["sailPositionsForPnL", graphUrl, address],
    queryFn: async () => {
      if (!graphUrl || !address) {
        return { userSailPositions: [] as Array<Record<string, unknown>> };
      }

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: getGraphHeaders(graphUrl),
        body: JSON.stringify({
          query: `
            query GetUserSailPositions($userAddress: Bytes!) {
              userSailPositions(
                where: { user: $userAddress, balance_gt: "0" }
                first: 1000
              ) {
                tokenAddress
                totalCostBasisUSD
                realizedPnLUSD
              }
            }
          `,
          variables: { userAddress: address.toLowerCase() },
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.errors) {
        return { userSailPositions: [] };
      }
      return result?.data ?? { userSailPositions: [] };
    },
    enabled: isConnected && !!address && !!graphUrl,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const pnlFromMarkets = useMemo(() => {
    if (!isConnected || !address) {
      const totalPnL = sailPnLSummary.isLoading
        ? 0
        : sailPnLSummary.totalPnLUSD;
      return {
        totalPnL,
        totalCostBasisUSD: 0,
        pnlPercent: null as number | null,
      };
    }

    const positions = (positionsData?.userSailPositions ?? []) as Array<{
      tokenAddress: string;
      totalCostBasisUSD: number;
      realizedPnLUSD: number;
    }>;

    const positionMap = new Map<string, (typeof positions)[0]>();
    positions.forEach((pos) => {
      positionMap.set(pos.tokenAddress.toLowerCase(), pos);
    });

    let totalRealizedPnL = 0;
    let totalUnrealizedPnL = 0;
    let totalCostBasisUSD = 0;

    sailMarkets.forEach(([id, market], marketIndex) => {
      const userDeposit = userDepositMap.get(marketIndex);
      if (!userDeposit || userDeposit <= 0n) return;

      const leveragedTokenAddress = (market as { addresses?: { leveragedToken?: `0x${string}` } })
        .addresses?.leveragedToken as `0x${string}` | undefined;
      if (!leveragedTokenAddress) return;

      const position = positionMap.get(leveragedTokenAddress.toLowerCase());
      if (!position) return;

      const tokenPrices = tokenPricesByMarket[id];
      const currentPriceUSD = tokenPrices?.leveragedPriceUSD ?? 0;
      if (!currentPriceUSD || currentPriceUSD <= 0) return;

      const currentValueUSD = (Number(userDeposit) / 1e18) * currentPriceUSD;

      const costBasisUSD = Number(position.totalCostBasisUSD) || 0;
      totalCostBasisUSD += costBasisUSD;

      const unrealizedPnL = currentValueUSD - costBasisUSD;

      const realizedPnL = Number(position.realizedPnLUSD) || 0;

      totalRealizedPnL += realizedPnL;
      totalUnrealizedPnL += unrealizedPnL;
    });

    const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
    const pnlPercent =
      totalCostBasisUSD > 0 ? (totalPnL / totalCostBasisUSD) * 100 : null;

    return { totalPnL, totalCostBasisUSD, pnlPercent };
  }, [
    isConnected,
    address,
    sailMarkets,
    userDepositMap,
    tokenPricesByMarket,
    positionsData,
    sailPnLSummary,
  ]);

  const activeMarkets = useMemo(
    () =>
      filterSailActiveMarkets(
        displayedSailMarkets,
        sailMarketIdToIndex,
        marketOffsets,
        reads,
        longFilterSelected,
        shortFilterSelected
      ),
    [
      displayedSailMarkets,
      longFilterSelected,
      shortFilterSelected,
      reads,
      marketOffsets,
      sailMarketIdToIndex,
    ]
  );

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
    activeSailBoostEndTimestamp,
    activeMarkets,
  };
}
