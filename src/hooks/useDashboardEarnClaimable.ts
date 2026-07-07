"use client";

import { useMemo } from "react";
import { markets } from "@/config/markets";
import type { AnchorMarketTuple } from "@/types/anchor";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useAnchorContractReads } from "@/hooks/anchor/useAnchorContractReads";
import { useAnchorRewards } from "@/hooks/anchor/useAnchorRewards";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { buildTokenPriceInput } from "@/utils/tokenPriceInput";

export function useDashboardEarnClaimable() {
  const { isConnected } = useHarborAccount();

  const anchorMarkets = useMemo(
    () =>
      Object.entries(markets).filter(([, m]) => m.peggedToken) as AnchorMarketTuple[],
    [],
  );

  const { reads, isLoading: readsLoading } = useAnchorContractReads(
    anchorMarkets,
    false,
    { enabled: isConnected },
  );

  const tokenPriceInputs = useMemo(
    () =>
      anchorMarkets
        .map(([marketId, m]) =>
          buildTokenPriceInput({
            marketId,
            minterAddress: m.addresses?.minter,
            pegTarget: m.pegTarget ?? "USD",
            chainId: m.chainId ?? 1,
          }),
        )
        .filter((input): input is NonNullable<typeof input> => input !== null),
    [anchorMarkets],
  );

  const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs);

  const peggedPriceUSDMap = useMemo(() => {
    const map: Record<string, bigint | undefined> = {};
    for (const [marketId, prices] of Object.entries(tokenPricesByMarket)) {
      if (prices.peggedPriceUSD > 0) {
        map[marketId] = BigInt(Math.round(prices.peggedPriceUSD * 1e18));
      }
    }
    return map;
  }, [tokenPricesByMarket]);

  const { prices: coinGeckoPrices } = useCoinGeckoPrices(["ethereum", "bitcoin"]);
  const ethPrice = coinGeckoPrices.ethereum ?? null;
  const btcPrice = coinGeckoPrices.bitcoin ?? null;

  const { poolRewardsMap, isLoadingAllRewards } = useAnchorRewards(
    anchorMarkets,
    reads,
    ethPrice,
    btcPrice,
    peggedPriceUSDMap,
  );

  const earnClaimableUsd = useMemo(() => {
    let total = 0;
    for (const [, m] of anchorMarkets) {
      const collateralAddr = m.addresses?.stabilityPoolCollateral;
      const sailAddr = m.addresses?.stabilityPoolLeveraged;
      if (collateralAddr) {
        const pr = poolRewardsMap.get(collateralAddr);
        if (pr && pr.claimableValue > 0) total += pr.claimableValue;
      }
      if (sailAddr) {
        const pr = poolRewardsMap.get(sailAddr);
        if (pr && pr.claimableValue > 0) total += pr.claimableValue;
      }
    }
    return total;
  }, [anchorMarkets, poolRewardsMap]);

  return {
    earnClaimableUsd,
    isLoading: isConnected && (readsLoading || isLoadingAllRewards),
  };
}
