export const REVENUE_SHARE_CALC_TRADING_FEE_PCT = 0.25;

export const REVENUE_SHARE_CALC_TRADING_VOLUME_TVL_MULTIPLIER = 10;

export const REVENUE_SHARE_CALC_DEFAULT_COLLATERAL_YIELD_PCT = 5;

export const REVENUE_SHARE_CALC_PRESET_TVLS_USD = [
  1_000_000,
  10_000_000,
  100_000_000,
] as const;

/** Growth scenario TVLs for the upside simulator milestone table and chart. */
export const REVENUE_SHARE_CALC_MILESTONE_TVLS_USD = [
  1_000_000,
  5_000_000,
  10_000_000,
  25_000_000,
] as const;

export const REVENUE_SHARE_CALC_DEFAULTS = {
  tvlUsd: REVENUE_SHARE_CALC_PRESET_TVLS_USD[0],
  collateralYieldPct: REVENUE_SHARE_CALC_DEFAULT_COLLATERAL_YIELD_PCT,
  tradingVolumeUsd:
    REVENUE_SHARE_CALC_PRESET_TVLS_USD[0] *
    REVENUE_SHARE_CALC_TRADING_VOLUME_TVL_MULTIPLIER,
  tradingFeePct: REVENUE_SHARE_CALC_TRADING_FEE_PCT,
} as const;

/** Slider bounds for the active-voyage revenue share calculator UI. */
export const REVENUE_SHARE_CALC_SLIDER_BOUNDS = {
  tvlUsd: { min: 100_000, max: 500_000_000, step: 100_000 },
  collateralYieldPct: { min: 0, max: 15, step: 0.1 },
  tradingVolumeUsd: { min: 0, max: 2_000_000_000, step: 100_000 },
} as const;

export type RevenueShareCalcInput = {
  tvlUsd: number;
  collateralYieldPct: number;
  tradingVolumeUsd: number;
  tradingFeePct: number;
  yourSharePct: number;
};

export type RevenueShareCalcResult = {
  collateralYieldPerYear: number;
  tradingFeesPerYear: number;
  totalMarketRevenue: number;
  yourEstimatedRevenue: number;
};

export type RevenueSharePresetEstimate = {
  tvlUsd: number;
  input: RevenueShareCalcInput;
  result: RevenueShareCalcResult;
};

export type RevenueShareMarketAssumptions = Omit<
  RevenueShareCalcInput,
  "tvlUsd" | "yourSharePct"
>;

export type UpsideMilestoneRow = {
  tvlUsd: number;
  marketRevenuePerYear: number;
  yourEarningsPerYear: number;
  foreverAprPct: number | null;
};

export type UpsideAtTvlResult = RevenueShareCalcResult & {
  revenueRatePct: number;
  foreverAprPct: number | null;
};

function sanitizeNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function tradingVolumeFromTvl(tvlUsd: number): number {
  return sanitizeNonNegative(tvlUsd) * REVENUE_SHARE_CALC_TRADING_VOLUME_TVL_MULTIPLIER;
}

/** Speculative annual revenue from TVL yield + trading fees × depositor share. */
export function computeRevenueShareEstimate(
  input: RevenueShareCalcInput,
): RevenueShareCalcResult {
  const tvlUsd = sanitizeNonNegative(input.tvlUsd);
  const collateralYieldPct = sanitizeNonNegative(input.collateralYieldPct);
  const tradingVolumeUsd = sanitizeNonNegative(input.tradingVolumeUsd);
  const tradingFeePct = sanitizeNonNegative(input.tradingFeePct);
  const yourSharePct = sanitizeNonNegative(input.yourSharePct);

  const collateralYieldPerYear = tvlUsd * (collateralYieldPct / 100);
  const tradingFeesPerYear = tradingVolumeUsd * (tradingFeePct / 100);
  const totalMarketRevenue = collateralYieldPerYear + tradingFeesPerYear;
  const yourEstimatedRevenue = (yourSharePct / 100) * totalMarketRevenue;

  return {
    collateralYieldPerYear,
    tradingFeesPerYear,
    totalMarketRevenue,
    yourEstimatedRevenue,
  };
}

export function buildPresetRevenueShareCalcInput(
  tvlUsd: number,
  yourSharePct: number,
): RevenueShareCalcInput {
  const safeTvl = sanitizeNonNegative(tvlUsd);
  return {
    tvlUsd: safeTvl,
    collateralYieldPct: REVENUE_SHARE_CALC_DEFAULT_COLLATERAL_YIELD_PCT,
    tradingVolumeUsd: tradingVolumeFromTvl(safeTvl),
    tradingFeePct: REVENUE_SHARE_CALC_TRADING_FEE_PCT,
    yourSharePct: sanitizeNonNegative(yourSharePct),
  };
}

export function computePresetRevenueShareEstimates(
  yourSharePct: number,
): RevenueSharePresetEstimate[] {
  return REVENUE_SHARE_CALC_PRESET_TVLS_USD.map((tvlUsd) => {
    const input = buildPresetRevenueShareCalcInput(tvlUsd, yourSharePct);
    return {
      tvlUsd,
      input,
      result: computeRevenueShareEstimate(input),
    };
  });
}

export function buildDefaultRevenueShareCalcInput(
  yourSharePct: number,
): RevenueShareCalcInput {
  return buildPresetRevenueShareCalcInput(
    REVENUE_SHARE_CALC_DEFAULTS.tvlUsd,
    yourSharePct,
  );
}

export function buildDefaultMarketAssumptions(): RevenueShareMarketAssumptions {
  return {
    collateralYieldPct: REVENUE_SHARE_CALC_DEFAULTS.collateralYieldPct,
    tradingVolumeUsd: REVENUE_SHARE_CALC_DEFAULTS.tradingVolumeUsd,
    tradingFeePct: REVENUE_SHARE_CALC_DEFAULTS.tradingFeePct,
  };
}

export function computeForeverAprPct(
  annualEarningsUsd: number,
  depositUsd: number,
): number | null {
  if (!Number.isFinite(depositUsd) || depositUsd <= 0) return null;
  if (!Number.isFinite(annualEarningsUsd) || annualEarningsUsd < 0) return null;
  return (annualEarningsUsd / depositUsd) * 100;
}

export function computeMarketRevenueRatePct(
  totalMarketRevenue: number,
  tvlUsd: number,
): number {
  const safeTvl = sanitizeNonNegative(tvlUsd);
  if (safeTvl <= 0) return 0;
  return (sanitizeNonNegative(totalMarketRevenue) / safeTvl) * 100;
}

export function computeUpsideAtTvl(
  tvlUsd: number,
  assumptions: RevenueShareMarketAssumptions,
  yourSharePct: number,
  depositUsd = 0,
): UpsideAtTvlResult {
  const result = computeRevenueShareEstimate({
    tvlUsd,
    ...assumptions,
    yourSharePct,
  });

  return {
    ...result,
    revenueRatePct: computeMarketRevenueRatePct(
      result.totalMarketRevenue,
      tvlUsd,
    ),
    foreverAprPct: computeForeverAprPct(
      result.yourEstimatedRevenue,
      depositUsd,
    ),
  };
}

export function computeUpsideMilestones(
  milestoneTvls: readonly number[],
  assumptions: RevenueShareMarketAssumptions,
  yourSharePct: number,
  depositUsd: number,
  projectedTvlUsd: number,
): UpsideMilestoneRow[] {
  const safeProjectedTvl = Math.max(sanitizeNonNegative(projectedTvlUsd), 1);
  const volumePerTvl = assumptions.tradingVolumeUsd / safeProjectedTvl;

  return milestoneTvls.map((tvlUsd) => {
    const atTvl = computeUpsideAtTvl(
      tvlUsd,
      {
        ...assumptions,
        tradingVolumeUsd: volumePerTvl * sanitizeNonNegative(tvlUsd),
      },
      yourSharePct,
      depositUsd,
    );
    return {
      tvlUsd,
      marketRevenuePerYear: atTvl.totalMarketRevenue,
      yourEarningsPerYear: atTvl.yourEstimatedRevenue,
      foreverAprPct: atTvl.foreverAprPct,
    };
  });
}

/** Index of the milestone row closest to the selected projected TVL. */
export function closestMilestoneIndex(
  milestoneTvls: readonly number[],
  selectedTvlUsd: number,
): number {
  if (milestoneTvls.length === 0) return -1;
  let bestIdx = 0;
  let bestDiff = Math.abs(milestoneTvls[0]! - selectedTvlUsd);
  for (let i = 1; i < milestoneTvls.length; i++) {
    const diff = Math.abs(milestoneTvls[i]! - selectedTvlUsd);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}
