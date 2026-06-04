import {
  FEATURED_COMPLETED_MARKET_IDS,
  getFeaturedVoyageNumber,
} from "@/config/maidenVoyageFeatured";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { computeGenesisRowUsdPricing } from "@/utils/genesisRowPricing";
import { formatCompactUSD } from "@/utils/anchor";
import { formatEther } from "viem";
import { readContractRowResult } from "@/components/genesis/readContractRow";

export type MaidenVoyageConfidenceStats = {
  completedLaunchesCount: number;
  featuredCompletedTotal: number;
  voyageNumber: number;
  completedDepositsUsd: number | null;
  completedDepositsLabel: string | null;
};

export function computeMaidenVoyageConfidenceStats({
  genesisMarkets,
  reads,
  totalDepositsReads,
  isConnected,
  collateralPricesMap,
  coinGeckoPrices,
  coinGeckoLoading,
  chainlinkBtcPrice,
}: {
  genesisMarkets: Array<[string, GenesisMarketConfig]>;
  reads: readonly unknown[] | undefined;
  totalDepositsReads: readonly unknown[] | undefined;
  isConnected: boolean;
  collateralPricesMap: Map<
    string,
    { priceUSD?: number } | undefined
  >;
  coinGeckoPrices: Record<string, number | null>;
  coinGeckoLoading: boolean;
  chainlinkBtcPrice: number | null;
}): MaidenVoyageConfidenceStats {
  let completedLaunchesCount = 0;
  let completedDepositsUsd = 0;
  let hasPricingForSum = true;

  for (const marketId of FEATURED_COMPLETED_MARKET_IDS) {
    const mi = genesisMarkets.findIndex(([id]) => id === marketId);
    if (mi < 0) continue;

    const mkt = genesisMarkets[mi][1];
    const baseOffset = mi * (isConnected ? 3 : 1);
    const ended =
      readContractRowResult<boolean>(reads, baseOffset) ?? false;
    if (ended) completedLaunchesCount += 1;

    const totalDeposits = readContractRowResult<bigint>(
      totalDepositsReads,
      mi,
    );
    const collateralSymbol = mkt.collateral?.symbol || "ETH";
    const oracleAddress = mkt.addresses?.collateralPrice as
      | `0x${string}`
      | undefined;
    const collateralPriceData = oracleAddress
      ? collateralPricesMap.get(oracleAddress.toLowerCase())
      : undefined;
    const underlyingSymbol =
      mkt.collateral?.underlyingSymbol || collateralSymbol;
    const { collateralPriceUSD } = computeGenesisRowUsdPricing({
      underlyingSymbol,
      pegTarget: mkt.pegTarget,
      marketCoinGeckoId: mkt.coinGeckoId,
      coinGeckoPrices,
      collateralPriceData: collateralPriceData as Parameters<
        typeof computeGenesisRowUsdPricing
      >[0]["collateralPriceData"],
      chainlinkBtcPrice,
      coinGeckoLoading,
      collateralSymbol,
    });

    if (!totalDeposits || totalDeposits <= 0n) {
      continue;
    }
    if (collateralPriceUSD <= 0) {
      hasPricingForSum = false;
      continue;
    }
    completedDepositsUsd +=
      Number(formatEther(totalDeposits)) * collateralPriceUSD;
  }

  return {
    completedLaunchesCount,
    featuredCompletedTotal: FEATURED_COMPLETED_MARKET_IDS.length,
    voyageNumber: getFeaturedVoyageNumber(),
    completedDepositsUsd: hasPricingForSum ? completedDepositsUsd : null,
    completedDepositsLabel:
      hasPricingForSum && completedDepositsUsd > 0
        ? formatCompactUSD(completedDepositsUsd)
        : null,
  };
}
