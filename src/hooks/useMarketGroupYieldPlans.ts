"use client";

import { useMemo } from "react";
import { minterABI } from "@/abis/minter";
import { useContractReads } from "wagmi";
import { WRAPPED_PRICE_ORACLE_ABI } from "@/abis/shared";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { successfulBigint } from "@/utils/stabilityPoolCompat";
import {
  computeMarketYieldPlan,
  type MarketGroupLike,
  type MarketYieldPlan,
  type TokenPriceMap,
} from "@/utils/marketYieldSnapshot";

type GroupReadIndices = {
  minter?: number;
  anchorSupply: number;
  anchorSupplyErc20: number;
  sailSupply: number;
  sailSupplyErc20: number;
  anchorAsset: number;
  oracle?: number;
  period: number;
};

function buildGroupReadContracts(groups: MarketGroupLike[]) {
  const contracts: Array<{
    address: `0x${string}`;
    abi: typeof minterABI | typeof stabilityPoolABI | typeof WRAPPED_PRICE_ORACLE_ABI;
    functionName: string;
  }> = [];
  const layouts: GroupReadIndices[] = [];

  for (const group of groups) {
    const anchor = group.anchorPool as { poolAddress: `0x${string}` };
    const sail = group.sailPool as { poolAddress: `0x${string}` };
    const layout: GroupReadIndices = {
      anchorSupply: -1,
      anchorSupplyErc20: -1,
      sailSupply: -1,
      sailSupplyErc20: -1,
      anchorAsset: -1,
      period: -1,
    };

    if (group.minterAddress) {
      layout.minter = contracts.length;
      contracts.push({
        address: group.minterAddress,
        abi: minterABI,
        functionName: "collateralTokenBalance",
      });
    }

    layout.anchorSupplyErc20 = contracts.length;
    contracts.push({
      address: anchor.poolAddress,
      abi: stabilityPoolABI,
      functionName: "totalSupply",
    });
    layout.anchorSupply = contracts.length;
    contracts.push({
      address: anchor.poolAddress,
      abi: stabilityPoolABI,
      functionName: "totalAssetSupply",
    });

    layout.sailSupplyErc20 = contracts.length;
    contracts.push({
      address: sail.poolAddress,
      abi: stabilityPoolABI,
      functionName: "totalSupply",
    });
    layout.sailSupply = contracts.length;
    contracts.push({
      address: sail.poolAddress,
      abi: stabilityPoolABI,
      functionName: "totalAssetSupply",
    });

    layout.anchorAsset = contracts.length;
    contracts.push({
      address: anchor.poolAddress,
      abi: stabilityPoolABI,
      functionName: "ASSET_TOKEN",
    });

    if (group.collateralPriceOracle) {
      layout.oracle = contracts.length;
      contracts.push({
        address: group.collateralPriceOracle,
        abi: WRAPPED_PRICE_ORACLE_ABI,
        functionName: "latestAnswer",
      });
    }

    layout.period = contracts.length;
    contracts.push({
      address: anchor.poolAddress,
      abi: stabilityPoolABI,
      functionName: "REWARD_PERIOD_LENGTH",
    });

    layouts.push(layout);
  }

  return { contracts, layouts };
}

export function useMarketGroupYieldPlans(input: {
  groups: MarketGroupLike[];
  depositTokenPrices: TokenPriceMap;
  rewardTokenPrices: TokenPriceMap;
  apyPctByMarketId: Record<string, number | null>;
  revenueSplitPct: number | null;
  minPoolTvlUsd: number;
  enabled?: boolean;
}): { plans: MarketYieldPlan[]; isLoading: boolean } {
  const {
    groups,
    depositTokenPrices,
    rewardTokenPrices,
    apyPctByMarketId,
    revenueSplitPct,
    minPoolTvlUsd,
    enabled = true,
  } = input;

  const { contracts, layouts } = useMemo(
    () => (enabled ? buildGroupReadContracts(groups) : { contracts: [], layouts: [] }),
    [groups, enabled],
  );

  const { data, isLoading } = useContractReads({
    contracts: contracts as Parameters<typeof useContractReads>[0]["contracts"],
    query: { enabled: enabled && contracts.length > 0 },
  });

  const plans = useMemo(() => {
    if (!enabled || groups.length === 0) return [];

    return groups.map((group, index) => {
      const layout = layouts[index];
      const readAt = <T,>(idx: number | undefined): T | undefined => {
        if (idx == null || idx < 0) return undefined;
        return data?.[idx]?.result as T | undefined;
      };
      const readSupply = (erc20: number, asset: number) =>
        successfulBigint(data?.[erc20]) ?? successfulBigint(data?.[asset]);

      return computeMarketYieldPlan({
        group,
        reads: {
          minterBalance: readAt<bigint>(layout.minter),
          anchorSupply: readSupply(layout.anchorSupplyErc20, layout.anchorSupply),
          sailSupply: readSupply(layout.sailSupplyErc20, layout.sailSupply),
          anchorAssetToken: readAt<`0x${string}`>(layout.anchorAsset),
          oracleAnswer: readAt<readonly [bigint, bigint, bigint, bigint]>(
            layout.oracle,
          ),
          periodSeconds: readAt<bigint>(layout.period),
        },
        depositTokenPrices,
        rewardTokenPrices,
        apyPct: apyPctByMarketId[group.marketId] ?? null,
        revenueSplitPct,
        minPoolTvlUsd,
      });
    });
  }, [
    enabled,
    groups,
    layouts,
    data,
    depositTokenPrices,
    rewardTokenPrices,
    apyPctByMarketId,
    revenueSplitPct,
    minPoolTvlUsd,
  ]);

  return { plans, isLoading };
}
