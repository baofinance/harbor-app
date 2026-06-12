export const REVENUE_SHARE_CALC_TRADING_FEE_PCT = 0.25;

export const REVENUE_SHARE_CALC_TRADING_VOLUME_TVL_MULTIPLIER = 10;

export const REVENUE_SHARE_CALC_DEFAULT_COLLATERAL_YIELD_PCT = 5;

export const REVENUE_SHARE_CALC_PRESET_TVLS_USD = [
  1_000_000,
  10_000_000,
  100_000_000,
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
