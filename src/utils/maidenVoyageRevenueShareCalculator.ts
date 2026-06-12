export const REVENUE_SHARE_CALC_DEFAULTS = {
  tvlUsd: 1_000_000,
  collateralYieldPct: 3,
  tradingVolumeUsd: 1_000_000,
  tradingFeePct: 0.15,
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

function sanitizeNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
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

export function buildDefaultRevenueShareCalcInput(
  yourSharePct: number,
): RevenueShareCalcInput {
  return {
    ...REVENUE_SHARE_CALC_DEFAULTS,
    yourSharePct: sanitizeNonNegative(yourSharePct),
  };
}
