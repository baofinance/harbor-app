import type { DefinedMarket } from "@/config/markets";
import { isSailSoonUi } from "@/config/markets";
import {
  bandsFromConfig,
  getCurrentFee,
  type FeeBand,
} from "@/utils/sailFeeBands";
import { formatLeverageFromCollateralRatio, formatToken } from "@/utils/sailDisplayFormat";

/** 1.0x leverage in WAD (18 decimals). */
const ONE_X_LEVERAGE_WAD = 10n ** 18n;
/** Treat ≤1.005x as 1.00x (display rounds to two decimals). */
const ONE_X_LEVERAGE_MAX_WAD = (ONE_X_LEVERAGE_WAD * 1005n) / 1000n;

/**
 * When sail leverage is ~1x, the market is almost entirely leveraged tokens —
 * more ha (pegged) liquidity is needed before leverage works. Deposits should pause.
 */
export function isSailDepositsPausedByLeverage(
  leverageRatio: bigint | undefined,
): boolean {
  if (leverageRatio === undefined || leverageRatio <= 0n) return false;
  return leverageRatio <= ONE_X_LEVERAGE_MAX_WAD;
}

export type SailTvlPriceInputs = {
  wrappedRate?: bigint;
  fxSAVEPrice?: number | null;
  fxSAVEPriceInETH?: bigint;
  ethPrice?: number | null;
  wstETHPrice?: number | null;
  collateralPriceUSD?: number;
  pegTargetUSD?: number;
  isCollateralPriceLoading?: boolean;
  isCoinGeckoLoading?: boolean;
};

export type SailMarketDetailMetrics = {
  tvlUSD: number | undefined;
  tvlCollateralDisplay: string;
  leverageRatio: bigint | undefined;
  collateralRatio: bigint | undefined;
  tokenPriceUSD: number | undefined;
  mintFeeRatio: bigint | undefined;
  redeemFeeRatio: bigint | undefined;
  activeMintBand: FeeBand | undefined;
  activeRedeemBand: FeeBand | undefined;
  minCollateralRatio: bigint | undefined;
  rebalanceThresholdLabel: string | undefined;
  collateralSymbol: string;
  underlyingToken: string;
  pegTarget: string;
  isFxUSDMarket: boolean;
};

type MinterConfigBands = {
  mintPeggedIncentiveConfig?: {
    collateralRatioBandUpperBounds?: readonly bigint[];
  };
  redeemPeggedIncentiveConfig?: {
    collateralRatioBandUpperBounds?: readonly bigint[];
  };
  mintLeveragedIncentiveConfig?: {
    collateralRatioBandUpperBounds?: readonly bigint[];
  };
  redeemLeveragedIncentiveConfig?: {
    collateralRatioBandUpperBounds?: readonly bigint[];
  };
};

export function isFxUsdCollateralMarket(market: DefinedMarket): boolean {
  const sym = market.collateral?.symbol?.toLowerCase() || "";
  return sym === "fxusd" || sym === "fxsave";
}

/** Minimum collateral ratio from rebalance threshold or minter incentive bands. */
export function resolveMinCollateralRatio(
  rebalanceThresholdData: bigint | undefined | null,
  minterConfigData: unknown | undefined
): bigint | undefined {
  if (rebalanceThresholdData !== undefined && rebalanceThresholdData !== null) {
    return rebalanceThresholdData as bigint;
  }

  if (!minterConfigData) return undefined;
  const config = minterConfigData as MinterConfigBands;
  const allFirstBounds: bigint[] = [];

  const pushFirst = (bounds: readonly bigint[] | undefined) => {
    if (bounds?.[0] !== undefined) allFirstBounds.push(bounds[0] as bigint);
  };

  pushFirst(config?.mintPeggedIncentiveConfig?.collateralRatioBandUpperBounds);
  pushFirst(config?.redeemPeggedIncentiveConfig?.collateralRatioBandUpperBounds);
  pushFirst(config?.mintLeveragedIncentiveConfig?.collateralRatioBandUpperBounds);
  pushFirst(
    config?.redeemLeveragedIncentiveConfig?.collateralRatioBandUpperBounds
  );

  if (allFirstBounds.length === 0) return undefined;
  return allFirstBounds.reduce((min, current) =>
    current < min ? current : min
  );
}

export function computeCollateralWrappedAmount(
  collateralValue: bigint | undefined,
  wrappedRate?: bigint
): number | undefined {
  if (!collateralValue) return undefined;
  const underlyingAmount = Number(collateralValue) / 1e18;
  const wrappedRateNum =
    wrappedRate !== undefined ? Number(wrappedRate) / 1e18 : 1.0;
  return wrappedRateNum > 0
    ? underlyingAmount / wrappedRateNum
    : underlyingAmount;
}

/** USD TVL from collateral value + oracle/CG prices (mirrors expanded view). */
export function computeSailMarketTvlUsd(
  market: DefinedMarket,
  collateralValue: bigint | undefined,
  prices: SailTvlPriceInputs
): number | undefined {
  if (!collateralValue) return undefined;

  const collateralTokensUnderlyingEq = Number(collateralValue) / 1e18;
  if (collateralTokensUnderlyingEq <= 0) return undefined;

  const wrappedRateNum =
    prices.wrappedRate !== undefined ? Number(prices.wrappedRate) / 1e18 : 1.0;
  const collateralTokensWrapped =
    wrappedRateNum > 0
      ? collateralTokensUnderlyingEq / wrappedRateNum
      : collateralTokensUnderlyingEq;

  const loading =
    prices.isCollateralPriceLoading || prices.isCoinGeckoLoading;
  if (loading) return undefined;

  const isFxUSDMarket = isFxUsdCollateralMarket(market);

  if (isFxUSDMarket) {
    let fxSAVEPriceUSD = 0;
    if (prices.fxSAVEPrice && prices.fxSAVEPrice > 1.0) {
      fxSAVEPriceUSD = prices.fxSAVEPrice;
    } else if (prices.fxSAVEPriceInETH && prices.ethPrice) {
      const fxSAVEPriceInETHNum = Number(prices.fxSAVEPriceInETH) / 1e18;
      const calculatedPrice = fxSAVEPriceInETHNum * prices.ethPrice;
      fxSAVEPriceUSD = calculatedPrice > 1.0 ? calculatedPrice : 1.08;
    } else {
      fxSAVEPriceUSD = 1.08;
    }

    return fxSAVEPriceUSD > 0
      ? collateralTokensWrapped * fxSAVEPriceUSD
      : undefined;
  }

  let effectivePrice = 0;
  if (prices.wstETHPrice) {
    effectivePrice = prices.wstETHPrice;
  } else if (
    (prices.collateralPriceUSD ?? 0) > 0 &&
    prices.pegTargetUSD
  ) {
    const underlyingPriceUSD =
      (prices.collateralPriceUSD ?? 0) * prices.pegTargetUSD;
    effectivePrice = underlyingPriceUSD * wrappedRateNum;
  } else {
    effectivePrice = 3960;
  }

  return effectivePrice > 0
    ? collateralTokensWrapped * effectivePrice
    : undefined;
}

export function buildSailMarketDetailMetrics(input: {
  market: DefinedMarket;
  marketId: string;
  collateralValue: bigint | undefined;
  leverageRatio: bigint | undefined;
  collateralRatio: bigint | undefined;
  minterConfigData: unknown | undefined;
  rebalanceThresholdData: bigint | undefined;
  tokenPrices?: {
    leveragedPriceUSD: number;
    pegTargetUSD: number;
  };
  prices: SailTvlPriceInputs;
}): SailMarketDetailMetrics {
  const { market, collateralValue, leverageRatio, collateralRatio } = input;
  const isFxUSDMarket = isFxUsdCollateralMarket(market);
  const collateralSymbol = market.collateral?.symbol || "ETH";
  const pegTarget = market.pegTarget || "USD";
  const underlyingToken =
    market.collateral?.underlyingSymbol ||
    market.collateral?.symbol ||
    "USD";

  const wrappedAmount = computeCollateralWrappedAmount(
    collateralValue,
    input.prices.wrappedRate
  );
  const tvlUSD = computeSailMarketTvlUsd(
    market,
    collateralValue,
    input.prices
  );

  const tvlCollateralDisplay =
    wrappedAmount !== undefined
      ? `${formatToken(BigInt(Math.floor(wrappedAmount * 1e18)))} ${collateralSymbol}`
      : `- ${collateralSymbol}`;

  const minCollateralRatio = resolveMinCollateralRatio(
    input.rebalanceThresholdData,
    input.minterConfigData
  );

  let mintBands: FeeBand[] | undefined;
  let redeemBands: FeeBand[] | undefined;
  if (input.minterConfigData && typeof input.minterConfigData === "object") {
    const cfg = input.minterConfigData as Record<string, unknown>;
    mintBands = bandsFromConfig(cfg.mintLeveragedIncentiveConfig);
    redeemBands = bandsFromConfig(cfg.redeemLeveragedIncentiveConfig);
  }

  const mintFeeRatio = getCurrentFee(mintBands, collateralRatio);
  const redeemFeeRatio = getCurrentFee(redeemBands, collateralRatio);

  const rebalanceThresholdLabel =
    minCollateralRatio !== undefined
      ? formatLeverageFromCollateralRatio(minCollateralRatio)
      : undefined;

  return {
    tvlUSD,
    tvlCollateralDisplay,
    leverageRatio,
    collateralRatio,
    tokenPriceUSD: input.tokenPrices?.leveragedPriceUSD,
    mintFeeRatio,
    redeemFeeRatio,
    activeMintBand: mintBands?.find(
      (b) =>
        collateralRatio !== undefined &&
        collateralRatio >= b.lowerBound &&
        (b.upperBound === undefined || collateralRatio <= b.upperBound)
    ),
    activeRedeemBand: redeemBands?.find(
      (b) =>
        collateralRatio !== undefined &&
        collateralRatio >= b.lowerBound &&
        (b.upperBound === undefined || collateralRatio <= b.upperBound)
    ),
    minCollateralRatio,
    rebalanceThresholdLabel,
    collateralSymbol,
    underlyingToken,
    pegTarget,
    isFxUSDMarket,
  };
}

/** Pick highest-TVL live market; skip coming-soon and ~1x leverage (deposits paused). Tie-break by marketId. */
export function pickDefaultSailMarketId(
  markets: readonly [string, DefinedMarket][],
  tvlById: ReadonlyMap<string, number | undefined>,
  leverageById?: ReadonlyMap<string, bigint | undefined>,
): string | null {
  if (markets.length === 0) return null;

  const liveMarkets = markets.filter(([id, market]) => {
    if (isSailSoonUi(market)) return false;
    if (
      leverageById &&
      isSailDepositsPausedByLeverage(leverageById.get(id))
    ) {
      return false;
    }
    return true;
  });
  const candidates = liveMarkets.length > 0 ? liveMarkets : markets;

  let bestId: string | null = null;
  let bestTvl = -1;

  for (const [id] of candidates) {
    const tvl = tvlById.get(id);
    if (tvl === undefined || tvl <= 0) continue;
    if (tvl > bestTvl || (tvl === bestTvl && (bestId === null || id < bestId))) {
      bestTvl = tvl;
      bestId = id;
    }
  }

  if (bestId) return bestId;

  const sorted = [...candidates].map(([id]) => id).sort();
  return sorted[0] ?? null;
}
