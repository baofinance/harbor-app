import { describe, expect, it } from "vitest";
import {
  computeCollateralYieldRewards,
  poolTvlSplitPercentages,
} from "./collateralYieldRewardCalc";

describe("computeCollateralYieldRewards", () => {
  it("matches fxUSD-ETH example (collateral yield split across pools)", () => {
    const result = computeCollateralYieldRewards({
      collateralValueUsd: 11790,
      apyPct: 3.61,
      periodDays: 7,
      rewardTokenPriceUsd: 1.0945350483889254,
      anchorSplitPct: 50,
      sailSplitPct: 50,
    });

    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;

    expect(result.periodYieldUsd).toBeCloseTo(8.16, 1);
    expect(result.totalRewardTokens).toBeCloseTo(7.46, 1);
    expect(result.anchorRewardTokens).toBeCloseTo(3.73, 1);
    expect(result.sailRewardTokens).toBeCloseTo(3.73, 1);
  });

  it("works for wstETH EUR pool with TVL-proportional split", () => {
    const result = computeCollateralYieldRewards({
      collateralValueUsd: 25000,
      apyPct: 3.2,
      periodDays: 7,
      rewardTokenPriceUsd: 4200,
      anchorSplitPct: 60,
      sailSplitPct: 40,
    });

    expect(result).not.toHaveProperty("error");
    if ("error" in result) return;

    expect(result.periodYieldUsd).toBeCloseTo(15.34, 1);
    expect(result.totalRewardTokens).toBeCloseTo(0.00365, 3);
    expect(result.anchorRewardTokens).toBeCloseTo(0.00219, 3);
    expect(result.sailRewardTokens).toBeCloseTo(0.00146, 3);
  });

  it("applies global revenue split before pool allocation", () => {
    const full = computeCollateralYieldRewards({
      collateralValueUsd: 11790,
      apyPct: 3.61,
      periodDays: 7,
      rewardTokenPriceUsd: 1.0945350483889254,
      anchorSplitPct: 50,
      sailSplitPct: 50,
      revenueSplitPct: 100,
    });
    const split75 = computeCollateralYieldRewards({
      collateralValueUsd: 11790,
      apyPct: 3.61,
      periodDays: 7,
      rewardTokenPriceUsd: 1.0945350483889254,
      anchorSplitPct: 50,
      sailSplitPct: 50,
      revenueSplitPct: 75,
    });

    expect(full).not.toHaveProperty("error");
    expect(split75).not.toHaveProperty("error");
    if ("error" in full || "error" in split75) return;

    expect(split75.periodYieldUsd).toBeCloseTo(full.periodYieldUsd * 0.75, 2);
    expect(split75.totalRewardTokens).toBeCloseTo(full.totalRewardTokens * 0.75, 2);
    expect(split75.grossPeriodYieldUsd).toBeCloseTo(full.periodYieldUsd, 2);
  });
});

describe("poolTvlSplitPercentages", () => {
  it("splits by pool TVL share", () => {
    const split = poolTvlSplitPercentages(4620, 3580);
    expect(split).not.toBeNull();
    expect(split?.anchorPct).toBeCloseTo(56.35, 1);
    expect(split?.sailPct).toBeCloseTo(43.65, 1);
  });
});
