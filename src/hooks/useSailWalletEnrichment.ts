"use client";

import { useMemo } from "react";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { useMarketBoostWindows } from "@/hooks/useMarketBoostWindows";
import {
  useSailPositionsForIndex,
  type SailIndexPosition,
} from "@/hooks/useSailPositionsForIndex";
import type { SailMarketTuple, SailContractReads } from "@/types/sail";
import type { SailDropdownPositionTone } from "@/utils/sailMarketDropdownPosition";
import { buildSailMarketDropdownPositionDisplay } from "@/utils/sailMarketDropdownPositionDisplay";

type TokenPricesByMarket = Record<
  string,
  { leveragedPriceUSD?: number } | undefined
>;

export type UseSailWalletEnrichmentArgs = {
  isConnected: boolean;
  address: `0x${string}` | undefined;
  sailMarkets: SailMarketTuple[];
  sailMarketIdToIndex: Map<string, number>;
  reads: SailContractReads | undefined;
  marketOffsets: Map<number, number>;
  tokenPricesByMarket: TokenPricesByMarket;
  userDepositMap: Map<number, bigint | undefined>;
};

/**
 * Connected-wallet Sail index enrichment: marks, boosts, user stats, PnL, dropdown tones.
 */
export function useSailWalletEnrichment({
  isConnected,
  address,
  sailMarkets,
  sailMarketIdToIndex,
  reads,
  marketOffsets,
  tokenPricesByMarket,
  userDepositMap,
}: UseSailWalletEnrichmentArgs) {
  const {
    sailBalances,
    loading: isLoadingSailMarks,
    error: sailMarksError,
  } = useAnchorLedgerMarks({ enabled: isConnected });

  const { totalSailMarks, sailMarksPerDay } = useMemo(() => {
    if (!sailBalances || sailBalances.length === 0) {
      return { totalSailMarks: 0, sailMarksPerDay: 0 };
    }

    const totalMarks = sailBalances.reduce(
      (sum: number, balance: { estimatedMarks: number }) =>
        sum + balance.estimatedMarks,
      0
    );
    const totalPerDay = sailBalances.reduce(
      (sum: number, balance: { marksPerDay: number }) =>
        sum + balance.marksPerDay,
      0
    );

    return {
      totalSailMarks: totalMarks,
      sailMarksPerDay: totalPerDay,
    };
  }, [sailBalances]);

  const sailBoostIds = useMemo(() => {
    const ids: string[] = [];
    for (const [, market] of sailMarkets) {
      const leveragedTokenAddress = market.addresses?.leveragedToken as
        | string
        | undefined;
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

  const { positions, positionsPnLLoading, sailPnLSummary } =
    useSailPositionsForIndex(isConnected);

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

    const positionMap = new Map<string, SailIndexPosition>();
    positions.forEach((pos) => {
      positionMap.set(pos.tokenAddress.toLowerCase(), pos);
    });

    let totalRealizedPnL = 0;
    let totalUnrealizedPnL = 0;
    let totalCostBasisUSD = 0;

    sailMarkets.forEach(([id, market], marketIndex) => {
      const userDeposit = userDepositMap.get(marketIndex);
      if (!userDeposit || userDeposit <= 0n) return;

      const leveragedTokenAddress = (
        market as { addresses?: { leveragedToken?: `0x${string}` } }
      ).addresses?.leveragedToken as `0x${string}` | undefined;
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
    positions,
    sailPnLSummary,
  ]);

  const marketDropdownPositionByMarketId = useMemo(() => {
    const map: Record<
      string,
      { label?: string; tone: SailDropdownPositionTone }
    > = {};
    if (!isConnected) return map;

    const positionMap = new Map<string, (typeof positions)[0]>();
    for (const pos of positions) {
      positionMap.set(pos.tokenAddress.toLowerCase(), pos);
    }

    for (const [marketId, market] of sailMarkets) {
      const globalIndex = sailMarketIdToIndex.get(marketId);
      const userDeposit =
        globalIndex !== undefined ? userDepositMap.get(globalIndex) : undefined;
      if (!userDeposit || userDeposit <= 0n) continue;

      const leveragedTokenAddress = market.addresses?.leveragedToken as
        | `0x${string}`
        | undefined;
      const position = leveragedTokenAddress
        ? positionMap.get(leveragedTokenAddress.toLowerCase())
        : undefined;
      const costBasisUSD =
        position != null ? Number(position.totalCostBasisUSD) : undefined;

      const display = buildSailMarketDropdownPositionDisplay({
        market,
        userDeposit,
        leveragedPriceUSD:
          tokenPricesByMarket[marketId]?.leveragedPriceUSD ?? undefined,
        costBasisUSD,
        pnlLoading: positionsPnLLoading,
      });

      if (display.hasPosition) {
        map[marketId] = {
          label: display.label,
          tone: display.tone ?? "pending",
        };
      }
    }

    return map;
  }, [
    isConnected,
    sailMarkets,
    sailMarketIdToIndex,
    userDepositMap,
    tokenPricesByMarket,
    positions,
    positionsPnLLoading,
  ]);

  const marketDropdownPnLToneByMarketId = useMemo(() => {
    const tones: Record<string, SailDropdownPositionTone> = {};
    for (const [marketId, position] of Object.entries(
      marketDropdownPositionByMarketId
    )) {
      tones[marketId] = position.tone;
    }
    return tones;
  }, [marketDropdownPositionByMarketId]);

  return {
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
  };
}
