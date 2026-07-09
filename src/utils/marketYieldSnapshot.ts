import {
  computeCollateralYieldRewards,
  formatRewardTokenAmount,
  poolTvlSplitPercentages,
} from "@/utils/collateralYieldRewardCalc";

export type MarketGroupLike = {
  marketId: string;
  marketName: string;
  anchorPool: { key: string };
  sailPool: { key: string };
  minterAddress: `0x${string}` | null;
  wrappedCollateralToken: `0x${string}` | null;
  collateralPriceOracle: `0x${string}` | null;
  collateralSymbol: string;
  rewardTokenSymbol: string;
};

export type TokenPriceMap = Record<string, string>;

export type MarketYieldReadData = {
  minterBalance?: bigint;
  anchorSupply?: bigint;
  sailSupply?: bigint;
  anchorAssetToken?: `0x${string}`;
  oracleAnswer?: readonly [bigint, bigint, bigint, bigint];
  periodSeconds?: bigint;
};

export type PoolYieldLine = {
  poolKey: string;
  poolKind: "collateral" | "leveraged";
  tvlUsd: number | null;
  rewardAmount: string | null;
  meetsMinTvl: boolean;
};

export type MarketYieldPlan = {
  marketId: string;
  marketName: string;
  rewardTokenSymbol: string;
  collateralValueUsd: number | null;
  grossPeriodYieldUsd: number | null;
  allocatedPeriodYieldUsd: number | null;
  anchorLine: PoolYieldLine;
  sailLine: PoolYieldLine;
  error: string | null;
};

function parsePrice(map: TokenPriceMap, address: string | null | undefined) {
  if (!address) return null;
  const raw = map[address.toLowerCase()] ?? "";
  if (!raw.trim()) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function computeMarketYieldPlan(input: {
  group: MarketGroupLike;
  reads: MarketYieldReadData;
  depositTokenPrices: TokenPriceMap;
  rewardTokenPrices: TokenPriceMap;
  apyPct: number | null;
  revenueSplitPct: number | null;
  minPoolTvlUsd: number;
}): MarketYieldPlan {
  const { group, reads, depositTokenPrices, rewardTokenPrices, apyPct, revenueSplitPct, minPoolTvlUsd } =
    input;

  const isFxMarket =
    group.collateralSymbol === "fxsave" || group.collateralSymbol === "fxusd";
  const isWstMarket =
    group.collateralSymbol === "wsteth" || group.collateralSymbol === "steth";

  const rewardPrice = parsePrice(
    rewardTokenPrices,
    group.wrappedCollateralToken ?? undefined,
  );
  const depositPrice = parsePrice(
    depositTokenPrices,
    reads.anchorAssetToken,
  );

  const collateralValueUsd = (() => {
    const balance = reads.minterBalance;
    if (balance == null) return null;
    const underlyingEq = Number(balance) / 1e18;
    if (!Number.isFinite(underlyingEq) || underlyingEq <= 0) return 0;

    if (isFxMarket) return underlyingEq;

    if (isWstMarket) {
      const maxWrappedRate = reads.oracleAnswer?.[3];
      const wrappedRateNum = maxWrappedRate ? Number(maxWrappedRate) / 1e18 : 0;
      const wstAmount =
        wrappedRateNum > 0 ? underlyingEq / wrappedRateNum : underlyingEq;
      if (rewardPrice != null) return wstAmount * rewardPrice;
      return null;
    }

    if (rewardPrice != null) return underlyingEq * rewardPrice;
    return null;
  })();

  const anchorTvlUsd =
    reads.anchorSupply != null && depositPrice != null
      ? (Number(reads.anchorSupply) / 1e18) * depositPrice
      : null;
  const sailTvlUsd =
    reads.sailSupply != null && depositPrice != null
      ? (Number(reads.sailSupply) / 1e18) * depositPrice
      : null;

  const defaultSplit =
    anchorTvlUsd != null && sailTvlUsd != null
      ? poolTvlSplitPercentages(anchorTvlUsd, sailTvlUsd)
      : null;

  const periodDays =
    reads.periodSeconds && reads.periodSeconds > 0n
      ? Number(reads.periodSeconds) / (24 * 60 * 60)
      : 7;

  const baseLines = (): Pick<
    MarketYieldPlan,
    "anchorLine" | "sailLine" | "error"
  > => ({
    anchorLine: {
      poolKey: group.anchorPool.key,
      poolKind: "collateral",
      tvlUsd: anchorTvlUsd,
      rewardAmount: null,
      meetsMinTvl:
        anchorTvlUsd != null && anchorTvlUsd >= minPoolTvlUsd,
    },
    sailLine: {
      poolKey: group.sailPool.key,
      poolKind: "leveraged",
      tvlUsd: sailTvlUsd,
      rewardAmount: null,
      meetsMinTvl: sailTvlUsd != null && sailTvlUsd >= minPoolTvlUsd,
    },
    error: null,
  });

  const empty = baseLines();

  if (collateralValueUsd == null) {
    return {
      marketId: group.marketId,
      marketName: group.marketName,
      rewardTokenSymbol: group.rewardTokenSymbol,
      collateralValueUsd: null,
      grossPeriodYieldUsd: null,
      allocatedPeriodYieldUsd: null,
      ...empty,
      error: "Loading collateral value…",
    };
  }
  if (apyPct == null || apyPct <= 0) {
    return {
      marketId: group.marketId,
      marketName: group.marketName,
      rewardTokenSymbol: group.rewardTokenSymbol,
      collateralValueUsd,
      grossPeriodYieldUsd: null,
      allocatedPeriodYieldUsd: null,
      ...empty,
      error: "Set wrapped collateral APY above.",
    };
  }
  if (rewardPrice == null) {
    return {
      marketId: group.marketId,
      marketName: group.marketName,
      rewardTokenSymbol: group.rewardTokenSymbol,
      collateralValueUsd,
      grossPeriodYieldUsd: null,
      allocatedPeriodYieldUsd: null,
      ...empty,
      error: `Set ${group.rewardTokenSymbol} reward token price above.`,
    };
  }
  if (depositPrice == null) {
    return {
      marketId: group.marketId,
      marketName: group.marketName,
      rewardTokenSymbol: group.rewardTokenSymbol,
      collateralValueUsd,
      grossPeriodYieldUsd: null,
      allocatedPeriodYieldUsd: null,
      ...empty,
      error: "Set deposit token (ha*) price above for TVL split.",
    };
  }
  if (!defaultSplit) {
    return {
      marketId: group.marketId,
      marketName: group.marketName,
      rewardTokenSymbol: group.rewardTokenSymbol,
      collateralValueUsd,
      grossPeriodYieldUsd: null,
      allocatedPeriodYieldUsd: null,
      ...empty,
      error: "Loading pool TVL…",
    };
  }
  if (revenueSplitPct == null || revenueSplitPct <= 0) {
    return {
      marketId: group.marketId,
      marketName: group.marketName,
      rewardTokenSymbol: group.rewardTokenSymbol,
      collateralValueUsd,
      grossPeriodYieldUsd: null,
      allocatedPeriodYieldUsd: null,
      ...empty,
      error: "Set revenue split above.",
    };
  }

  const yieldResult = computeCollateralYieldRewards({
    collateralValueUsd,
    apyPct,
    periodDays,
    rewardTokenPriceUsd: rewardPrice,
    anchorSplitPct: defaultSplit.anchorPct,
    sailSplitPct: defaultSplit.sailPct,
    revenueSplitPct,
  });

  if ("error" in yieldResult) {
    return {
      marketId: group.marketId,
      marketName: group.marketName,
      rewardTokenSymbol: group.rewardTokenSymbol,
      collateralValueUsd,
      grossPeriodYieldUsd: null,
      allocatedPeriodYieldUsd: null,
      ...empty,
      error: yieldResult.error,
    };
  }

  const anchorAmount = formatRewardTokenAmount(yieldResult.anchorRewardTokens);
  const sailAmount = formatRewardTokenAmount(yieldResult.sailRewardTokens);

  return {
    marketId: group.marketId,
    marketName: group.marketName,
    rewardTokenSymbol: group.rewardTokenSymbol,
    collateralValueUsd,
    grossPeriodYieldUsd: yieldResult.grossPeriodYieldUsd,
    allocatedPeriodYieldUsd: yieldResult.periodYieldUsd,
    anchorLine: {
      poolKey: group.anchorPool.key,
      poolKind: "collateral",
      tvlUsd: anchorTvlUsd,
      rewardAmount: anchorAmount,
      meetsMinTvl:
        anchorTvlUsd != null && anchorTvlUsd >= minPoolTvlUsd,
    },
    sailLine: {
      poolKey: group.sailPool.key,
      poolKind: "leveraged",
      tvlUsd: sailTvlUsd,
      rewardAmount: sailAmount,
      meetsMinTvl: sailTvlUsd != null && sailTvlUsd >= minPoolTvlUsd,
    },
    error: null,
  };
}

export function poolKeysMeetingMinTvl(
  plans: MarketYieldPlan[],
  minPoolTvlUsd: number,
): string[] {
  const keys: string[] = [];
  for (const plan of plans) {
    for (const line of [plan.anchorLine, plan.sailLine]) {
      if (line.tvlUsd != null && line.tvlUsd >= minPoolTvlUsd) {
        keys.push(line.poolKey);
      }
    }
  }
  return keys;
}

export function formatUsdCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
