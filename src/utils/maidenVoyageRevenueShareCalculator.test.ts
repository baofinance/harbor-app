import { describe, expect, it } from "vitest";
import {
  REVENUE_SHARE_CALC_DEFAULTS,
  buildDefaultRevenueShareCalcInput,
  computeRevenueShareEstimate,
} from "./maidenVoyageRevenueShareCalculator";

describe("computeRevenueShareEstimate", () => {
  it("computes defaults with 0.10% share", () => {
    const result = computeRevenueShareEstimate({
      ...REVENUE_SHARE_CALC_DEFAULTS,
      yourSharePct: 0.1,
    });

    expect(result.collateralYieldPerYear).toBe(30_000);
    expect(result.tradingFeesPerYear).toBe(1_500);
    expect(result.totalMarketRevenue).toBe(31_500);
    expect(result.yourEstimatedRevenue).toBeCloseTo(31.5, 5);
  });

  it("returns zero your revenue when share is zero", () => {
    const result = computeRevenueShareEstimate(
      buildDefaultRevenueShareCalcInput(0),
    );

    expect(result.yourEstimatedRevenue).toBe(0);
    expect(result.totalMarketRevenue).toBe(31_500);
  });

  it("handles zero TVL and volume without NaN", () => {
    const result = computeRevenueShareEstimate({
      tvlUsd: 0,
      collateralYieldPct: 3,
      tradingVolumeUsd: 0,
      tradingFeePct: 0.15,
      yourSharePct: 0.1,
    });

    expect(result.collateralYieldPerYear).toBe(0);
    expect(result.tradingFeesPerYear).toBe(0);
    expect(result.totalMarketRevenue).toBe(0);
    expect(result.yourEstimatedRevenue).toBe(0);
    expect(Number.isFinite(result.yourEstimatedRevenue)).toBe(true);
  });
});
