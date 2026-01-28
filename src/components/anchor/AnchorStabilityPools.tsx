"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { markets } from "@/config/markets";
import { useAnchorContractReads } from "@/hooks/anchor/useAnchorContractReads";
import { useAnchorPrices } from "@/hooks/anchor/useAnchorPrices";
import { useAnchorRewards } from "@/hooks/anchor/useAnchorRewards";
import { usePeggedTokenPrices } from "@/hooks/usePeggedTokenPrices";

type AnchorStabilityPoolsProps = {
  tokenSymbol: string;
};

const poolCopy = {
  collateral: {
    title: "Collateral Stability Pool",
  },
  sail: {
    title: "Sail Stability Pool",
  },
};

const tokenIconMap: Record<string, string> = {
  haeth: "/icons/haETH.png",
  habtc: "/icons/haBTC.png",
  haeur: "/icons/haEUR.png",
  hsausd: "/icons/haUSD2.png",
  fxsave: "/icons/fxSave.png",
  fxusd: "/icons/fxUSD.webp",
  usdc: "/icons/usdc.webp",
  wsteth: "/icons/wstETH.webp",
  steth: "/icons/steth_logo.webp",
  hsethbtc: "/icons/hsETHBTC.png",
  hsusdbtc: "/icons/hsUSDBTC.png",
  hsusdeth: "/icons/hsUSDETH.png",
  hsusdeur: "/icons/hsUSDeur.png",
  hsstetheur: "/icons/hsSTETHEUR.png",
  steamedeth: "/icons/steamedeth.svg",
  steamedusd: "/icons/steamedUSD.png",
};

function getTokenIcon(symbol: string) {
  return tokenIconMap[symbol.toLowerCase()] || "/icons/placeholder.svg";
}

export function AnchorStabilityPools({ tokenSymbol }: AnchorStabilityPoolsProps) {
  const anchorMarkets = useMemo(() => {
    return Object.entries(markets).filter(
      ([, market]) =>
        market.peggedToken?.symbol?.toLowerCase() === tokenSymbol.toLowerCase()
    );
  }, [tokenSymbol]);

  const { reads, isLoading: isLoadingReads } =
    useAnchorContractReads(anchorMarkets);

  const peggedPriceConfigs = useMemo(
    () =>
      anchorMarkets.map(([marketId, market]) => ({
        marketId,
        minterAddress: (market as any).addresses?.minter as
          | `0x${string}`
          | undefined,
      })),
    [anchorMarkets]
  );

  const { priceMap: peggedPriceMap } = usePeggedTokenPrices(
    peggedPriceConfigs,
    anchorMarkets.length > 0
  );

  const { peggedPriceUSDMap, ethPrice, btcPrice } = useAnchorPrices(
    anchorMarkets,
    reads,
    peggedPriceMap
  );

  const { allPoolsForRewards, poolRewardsMap, isLoadingAllRewards } =
    useAnchorRewards(
      anchorMarkets,
      reads,
      ethPrice,
      btcPrice,
      peggedPriceUSDMap
    );

  const poolRows = useMemo(() => {
    if (!allPoolsForRewards.length) return [];

    return allPoolsForRewards.map((pool) => {
      const marketEntry = anchorMarkets.find(([id]) => id === pool.marketId);
      const market = marketEntry?.[1];

      const marketName = market?.name || pool.marketId;
      const collateralSymbol = market?.collateral?.symbol || "-";
      const poolRewards = poolRewardsMap.get(pool.address);

      // Use APR directly from poolRewardsMap (same as Anchor page)
      const apr = poolRewards?.totalRewardAPR ?? 0;

      const rewardSymbols = (poolRewards?.rewardTokens || [])
        .map((token) => token.symbol)
        .filter(Boolean);
      const uniqueRewardSymbols = Array.from(new Set(rewardSymbols));

      return {
        key: `${pool.marketId}-${pool.poolType}`,
        marketId: pool.marketId,
        marketName,
        collateralSymbol,
        poolType: pool.poolType,
        apr,
        rewardSymbols: uniqueRewardSymbols,
      };
    });
  }, [allPoolsForRewards, anchorMarkets, poolRewardsMap]);

  const groupedPools = useMemo(() => {
    const groups = new Map<string, typeof poolRows>();
    poolRows.forEach((pool) => {
      const existing = groups.get(pool.marketId) || [];
      existing.push(pool);
      groups.set(pool.marketId, existing);
    });
    return Array.from(groups.entries()).map(([key, pools]) => {
      const rewardSymbols = Array.from(
        new Set(pools.flatMap((pool) => pool.rewardSymbols))
      );
      return {
        key,
        rewardSymbols,
        pools,
      };
    });
  }, [poolRows]);

  if (anchorMarkets.length === 0) {
    return (
      <div className="text-white/70 text-sm">
        No stability pools found for {tokenSymbol}.
      </div>
    );
  }

  const isLoading = isLoadingReads || isLoadingAllRewards;

  return (
    <div className="space-y-3">
      {poolRows.length === 0 && (
        <div className="text-white/70 text-sm">
          {isLoading ? "Loading pools…" : "No active pools found yet."}
        </div>
      )}

      {groupedPools.map((group) => {
        const collateralPool = group.pools.find(
          (pool) => pool.poolType === "collateral"
        );
        const sailPool = group.pools.find((pool) => pool.poolType === "sail");

        const fallbackSymbol =
          collateralPool?.collateralSymbol || sailPool?.collateralSymbol || "";
        const earnedSymbols =
          group.rewardSymbols.length > 0
            ? group.rewardSymbols
            : fallbackSymbol
            ? [fallbackSymbol]
            : [];

        return (
          <div
            key={group.key}
            className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)] gap-3"
          >
            <div className="bg-black/[0.10] border border-white/10 p-4 flex flex-col items-center justify-center gap-3 text-center">
              <div className="text-white text-sm font-semibold">
                Earned tokens
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {earnedSymbols.length > 0 ? (
                  earnedSymbols.map((symbol) => (
                    <Image
                      key={symbol}
                      src={getTokenIcon(symbol)}
                      alt={symbol}
                      title={symbol}
                      width={36}
                      height={36}
                      className="h-9 w-9"
                    />
                  ))
                ) : (
                  <span className="text-white/50">—</span>
                )}
              </div>
            </div>
            {[collateralPool, sailPool].map((pool) => {
              if (!pool) {
                return (
                  <div
                    key={`missing-${group.key}`}
                    className="bg-black/[0.10] border border-white/10 p-4 text-white/60 text-sm"
                  >
                    Pool not available.
                  </div>
                );
              }
              const copy =
                pool.poolType === "collateral"
                  ? poolCopy.collateral
                  : poolCopy.sail;
              return (
                <div
                  key={pool.key}
                  className="bg-black/[0.10] border border-white/10 p-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-white text-base font-semibold">
                        {copy.title}
                      </div>
                      <div className="text-white/60 text-xs uppercase tracking-wider mt-1">
                        {pool.marketName} • Collateral: {pool.collateralSymbol}
                      </div>
                    </div>
                    <div className="text-white font-mono text-lg">
                      {isLoading ? "Loading…" : `${pool.apr.toFixed(2)}% APR`}
                    </div>
                  </div>
                  <Link
                    href="/anchor"
                    className="inline-flex items-center justify-center rounded-full bg-[#FF8A7A] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#E07A6A]"
                  >
                    Earn yield
                  </Link>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
