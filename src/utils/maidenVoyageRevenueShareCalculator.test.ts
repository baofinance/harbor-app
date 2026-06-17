import { describe, expect, it } from "vitest";
import {
  REVENUE_SHARE_CALC_DEFAULTS,
  REVENUE_SHARE_CALC_MILESTONE_TVLS_USD,
  buildDefaultMarketAssumptions,
  buildDefaultRevenueShareCalcInput,
  buildPresetRevenueShareCalcInput,
  closestMilestoneIndex,
  computeForeverAprPct,
  computeMarketRevenueRatePct,
  computePresetRevenueShareEstimates,
  computeRevenueShareEstimate,
  computeUpsideAtTvl,
  computeUpsideMilestones,
  tradingVolumeFromTvl,
} from "./maidenVoyageRevenueShareCalculator";

describe("computeRevenueShareEstimate", () => {
  it("computes defaults with 0.10% share", () => {
    const result = computeRevenueShareEstimate({
      ...REVENUE_SHARE_CALC_DEFAULTS,
      yourSharePct: 0.1,
    });

    expect(result.collateralYieldPerYear).toBe(50_000);
    expect(result.tradingFeesPerYear).toBe(25_000);
    expect(result.totalMarketRevenue).toBe(75_000);
    expect(result.yourEstimatedRevenue).toBeCloseTo(75, 5);
  });

  it("returns zero your revenue when share is zero", () => {
    const result = computeRevenueShareEstimate(
      buildDefaultRevenueShareCalcInput(0),
    );

    expect(result.yourEstimatedRevenue).toBe(0);
    expect(result.totalMarketRevenue).toBe(75_000);
  });

  it("handles zero TVL and volume without NaN", () => {
    const result = computeRevenueShareEstimate({
      tvlUsd: 0,
      collateralYieldPct: 5,
      tradingVolumeUsd: 0,
      tradingFeePct: 0.25,
      yourSharePct: 0.1,
    });

    expect(result.collateralYieldPerYear).toBe(0);
    expect(result.tradingFeesPerYear).toBe(0);
    expect(result.totalMarketRevenue).toBe(0);
    expect(result.yourEstimatedRevenue).toBe(0);
    expect(Number.isFinite(result.yourEstimatedRevenue)).toBe(true);
  });
});

describe("preset revenue share estimates", () => {
  it("uses 5% yield and 10x TVL volume for each preset", () => {
    const presets = computePresetRevenueShareEstimates(0.1);

    expect(presets).toHaveLength(3);
    expect(presets.map((p) => p.tvlUsd)).toEqual([1_000_000, 10_000_000, 100_000_000]);

    for (const preset of presets) {
      expect(preset.input.collateralYieldPct).toBe(5);
      expect(preset.input.tradingVolumeUsd).toBe(
        tradingVolumeFromTvl(preset.tvlUsd),
      );
    }

    expect(presets[0]!.result.yourEstimatedRevenue).toBeCloseTo(75, 5);
    expect(presets[1]!.result.yourEstimatedRevenue).toBeCloseTo(750, 5);
    expect(presets[2]!.result.yourEstimatedRevenue).toBeCloseTo(7500, 5);
  });

  it("builds preset input from TVL", () => {
    const input = buildPresetRevenueShareCalcInput(10_000_000, 0.2);

    expect(input.tvlUsd).toBe(10_000_000);
    expect(input.tradingVolumeUsd).toBe(100_000_000);
    expect(input.collateralYieldPct).toBe(5);
    expect(input.yourSharePct).toBe(0.2);
  });
});

describe("upside simulator helpers", () => {
  const assumptions = buildDefaultMarketAssumptions();
  const sharePct = 0.1;
  const depositUsd = 1_000;

  it("computes Forever APR from earnings and deposit", () => {
    expect(computeForeverAprPct(75, 1_000)).toBeCloseTo(7.5, 5);
    expect(computeForeverAprPct(75, 0)).toBeNull();
  });

  it("computes market revenue rate at default assumptions", () => {
    const atTvl = computeUpsideAtTvl(1_000_000, assumptions, sharePct, depositUsd);
    expect(atTvl.revenueRatePct).toBeCloseTo(7.5, 5);
    expect(atTvl.foreverAprPct).toBeCloseTo(7.5, 5);
  });

  it("builds milestone rows at 0.10% share", () => {
    const rows = computeUpsideMilestones(
      REVENUE_SHARE_CALC_MILESTONE_TVLS_USD,
      assumptions,
      sharePct,
      depositUsd,
      REVENUE_SHARE_CALC_DEFAULTS.tvlUsd,
    );

    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.yourEarningsPerYear)).toEqual([
      75, 375, 750, 1_875,
    ]);
    expect(rows[2]!.foreverAprPct).toBeCloseTo(75, 5);
  });

  it("finds closest milestone index to selected TVL", () => {
    expect(closestMilestoneIndex(REVENUE_SHARE_CALC_MILESTONE_TVLS_USD, 1_000_000)).toBe(0);
    expect(closestMilestoneIndex(REVENUE_SHARE_CALC_MILESTONE_TVLS_USD, 8_000_000)).toBe(2);
  });
});
