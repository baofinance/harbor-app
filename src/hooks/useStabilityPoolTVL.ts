"use client";

import { useMemo } from "react";
import { useAnvilContractReads } from "./useContractReads";
import { POLLING_INTERVALS } from "@/config/polling";
import {
  STABILITY_POOL_ABI,
  MINTER_ABI,
  CHAINLINK_ORACLE_ABI,
} from "@/abis/shared";

type TVLConfig = {
  poolAddress?: `0x${string}`;
  minterAddress?: `0x${string}`;
  priceOracleAddress?: `0x${string}`;
};

export type StabilityPoolTVLResult = {
  tvlAsset?: bigint; // totalAssetSupply in 18 decimals (ha token)
  tvlUSD?: number; // USD TVL using CR-aware peg price
  assetToken?: `0x${string}`;
};

/**
 * Compute USD TVL for stability pools using CR-aware peg USD pricing.
 *
 * Peg USD price (CR-aware):
 *   latestAnswer => (minUnder, maxUnder, minRate, maxRate) all 1e18
 *   underUSD = (minUnder + maxUnder) / 2
 *   rate = (minRate + maxRate) / 2
 *   collUsd = collateralBalance * rate * underUSD / 1e36
 *   pegTotalUsd = collUsd / (cr / 1e18)
 *   pegPriceUsd = pegTotalUsd / (pegSupply / 1e18)
 *
 * Pool TVL USD:
 *   poolSupply (ha, 1e18)
 *   poolUsd = (poolSupply / 1e18) * pegPriceUsd
 */
export function useStabilityPoolTVLs(configs: TVLConfig[]) {
  const contracts = useMemo(() => {
    const items: any[] = [];

    configs.forEach((cfg) => {
      if (cfg.poolAddress) {
        // Prefer totalAssets (some deployments) and fallback to totalAssetSupply
        items.push({
          address: cfg.poolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "totalAssets" as const,
        });
        items.push({
          address: cfg.poolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "totalAssetSupply" as const,
        });
        items.push({
          address: cfg.poolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "ASSET_TOKEN" as const,
        });
      }

      if (cfg.minterAddress) {
        // CR-aware peg pricing inputs
        items.push({
          address: cfg.minterAddress,
          abi: MINTER_ABI,
          functionName: "collateralTokenBalance" as const,
        });
        items.push({
          address: cfg.minterAddress,
          abi: MINTER_ABI,
          functionName: "collateralRatio" as const,
        });
        items.push({
          address: cfg.minterAddress,
          abi: MINTER_ABI,
          functionName: "peggedTokenBalance" as const,
        });
      }

      if (cfg.priceOracleAddress) {
        items.push({
          address: cfg.priceOracleAddress,
          abi: CHAINLINK_ORACLE_ABI,
          functionName: "latestAnswer" as const,
        });
      }
    });

    return items;
  }, [configs]);

  const { data, isLoading, error } = useAnvilContractReads({
    contracts,
    enabled: configs.length > 0 && contracts.length > 0,
    refetchInterval: POLLING_INTERVALS.SLOW,
  });

  const results = useMemo(() => {
    const map = new Map<`0x${string}`, StabilityPoolTVLResult>();
    if (!data || data.length === 0) {
      return map;
    }

    // Each config contributes up to:
    // Pools: totalAssets, totalAssetSupply, ASSET_TOKEN
    // Minter: collateralTokenBalance, collateralRatio, peggedTokenBalance
    // Oracle: latestAnswer
    let idx = 0;
    configs.forEach((cfg) => {
      if (!cfg.poolAddress) return;
      const poolAddr = cfg.poolAddress.toLowerCase() as `0x${string}`;

      const totalAssetsRead = cfg.poolAddress ? data[idx] : undefined;
      idx += cfg.poolAddress ? 1 : 0;
      const totalAssetSupplyRead = cfg.poolAddress ? data[idx] : undefined;
      idx += cfg.poolAddress ? 1 : 0;
      const assetTokenRead = cfg.poolAddress ? data[idx] : undefined;
      const assetToken =
        (assetTokenRead?.result as `0x${string}` | undefined) || undefined;
      idx += cfg.poolAddress ? 1 : 0;

      // CR-aware inputs from minter
      const collateralBalance = cfg.minterAddress
        ? (data[idx]?.result as bigint | undefined) ?? undefined
        : undefined;
      idx += cfg.minterAddress ? 1 : 0;
      const collateralRatio = cfg.minterAddress
        ? (data[idx]?.result as bigint | undefined) ?? undefined
        : undefined;
      idx += cfg.minterAddress ? 1 : 0;
      const peggedSupply = cfg.minterAddress
        ? (data[idx]?.result as bigint | undefined) ?? undefined
        : undefined;
      idx += cfg.minterAddress ? 1 : 0;

      // Oracle latestAnswer tuple: (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
      // OR a single bigint price value from simpler oracles
      const latestAnswer = cfg.priceOracleAddress
        ? data[idx]?.result
        : undefined;
      let minUnder: bigint | undefined;
      let maxUnder: bigint | undefined;
      let minRate: bigint | undefined;
      let maxRate: bigint | undefined;
      if (latestAnswer !== undefined && latestAnswer !== null) {
        if (Array.isArray(latestAnswer)) {
          minUnder = latestAnswer[0] as bigint;
          maxUnder = latestAnswer[1] as bigint;
          minRate = latestAnswer[2] as bigint;
          maxRate = latestAnswer[3] as bigint;
        } else if (typeof latestAnswer === "bigint") {
          // Simple oracle returning a single price value
          // Treat it as the underlying USD price with 1:1 wrapped rate
          minUnder = latestAnswer;
          maxUnder = latestAnswer;
          minRate = BigInt("1000000000000000000"); // 1e18 = 1:1 rate
          maxRate = BigInt("1000000000000000000");
        } else if (typeof latestAnswer === "object") {
          const obj = latestAnswer as {
            minUnderlyingPrice?: bigint;
            maxUnderlyingPrice?: bigint;
            minWrappedRate?: bigint;
            maxWrappedRate?: bigint;
          };
          minUnder = obj.minUnderlyingPrice;
          maxUnder = obj.maxUnderlyingPrice;
          minRate = obj.minWrappedRate;
          maxRate = obj.maxWrappedRate;
        }
      }
      idx += cfg.priceOracleAddress ? 1 : 0;

      let tvlUSD: number | undefined;
      const totalAssetSupply =
        (totalAssetsRead?.result as bigint | undefined) ??
        (totalAssetSupplyRead?.result as bigint | undefined);

      // Compute CR-aware pegPriceUsd
      let pegPriceUsd: number | undefined;
      if (
        collateralBalance !== undefined &&
        collateralRatio !== undefined &&
        collateralRatio > 0n &&
        peggedSupply !== undefined &&
        peggedSupply > 0n &&
        minUnder !== undefined &&
        maxUnder !== undefined &&
        minRate !== undefined &&
        maxRate !== undefined
      ) {
        const underUSD = Number(minUnder + maxUnder) / 2 / 1e18;
        const rate = Number(minRate + maxRate) / 2 / 1e18;
        const collUsd = (Number(collateralBalance) / 1e18) * rate * underUSD;
        const crFloat = Number(collateralRatio) / 1e18;
        const pegTotalUsd = collUsd / crFloat;
        const pegSupplyFloat = Number(peggedSupply) / 1e18;
        if (pegSupplyFloat > 0) {
          pegPriceUsd = pegTotalUsd / pegSupplyFloat;
        }
      }

      if (totalAssetSupply !== undefined && pegPriceUsd !== undefined) {
        const poolSupplyHa = Number(totalAssetSupply) / 1e18;
        tvlUSD = poolSupplyHa * pegPriceUsd;
      }

      map.set(poolAddr, {
        tvlAsset: totalAssetSupply,
        tvlUSD,
        assetToken,
      });
    });

    return map;
  }, [configs, data]);

  return {
    tvlMap: results,
    isLoading,
    error,
  };
}
