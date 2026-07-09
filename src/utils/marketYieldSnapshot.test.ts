import { describe, expect, it } from "vitest";
import {
  computeMarketYieldPlan,
  poolKeysMeetingMinTvl,
} from "./marketYieldSnapshot";

const group = {
  marketId: "eth-fxusd",
  marketName: "fxUSD - ETH",
  anchorPool: { key: "eth-fxusd:collateral" },
  sailPool: { key: "eth-fxusd:leveraged" },
  minterAddress: "0x1111111111111111111111111111111111111111" as const,
  wrappedCollateralToken: "0x2222222222222222222222222222222222222222" as const,
  collateralPriceOracle: null,
  collateralSymbol: "fxsave",
  rewardTokenSymbol: "fxSAVE",
};

describe("marketYieldSnapshot", () => {
  it("computes TVL-split rewards with revenue split", () => {
    const plan = computeMarketYieldPlan({
      group,
      reads: {
        minterBalance: 11_790n * 10n ** 18n,
        anchorSupply: 4_000n * 10n ** 18n,
        sailSupply: 3_000n * 10n ** 18n,
        anchorAssetToken: "0x3333333333333333333333333333333333333333",
        periodSeconds: 7n * 24n * 60n * 60n,
      },
      depositTokenPrices: {
        "0x3333333333333333333333333333333333333333": "3000",
      },
      rewardTokenPrices: {
        "0x2222222222222222222222222222222222222222": "1.09",
      },
      apyPct: 3.61,
      revenueSplitPct: 75,
      minPoolTvlUsd: 1000,
    });

    expect(plan.error).toBeNull();
    expect(plan.anchorLine.rewardAmount).not.toBeNull();
    expect(plan.sailLine.rewardAmount).not.toBeNull();
    expect(plan.anchorLine.meetsMinTvl).toBe(true);
    expect(plan.sailLine.meetsMinTvl).toBe(true);
  });

  it("flags pools below min TVL", () => {
    const plan = computeMarketYieldPlan({
      group,
      reads: {
        minterBalance: 1000n * 10n ** 18n,
        anchorSupply: 100n * 10n ** 18n,
        sailSupply: 3_000n * 10n ** 18n,
        anchorAssetToken: "0x3333333333333333333333333333333333333333",
        periodSeconds: 7n * 24n * 60n * 60n,
      },
      depositTokenPrices: {
        "0x3333333333333333333333333333333333333333": "3000",
      },
      rewardTokenPrices: {
        "0x2222222222222222222222222222222222222222": "1.09",
      },
      apyPct: 3.61,
      revenueSplitPct: 75,
      minPoolTvlUsd: 500_000,
    });

    expect(plan.anchorLine.meetsMinTvl).toBe(false);
    expect(plan.sailLine.meetsMinTvl).toBe(true);
    expect(poolKeysMeetingMinTvl([plan], 500_000)).toEqual([
      "eth-fxusd:leveraged",
    ]);
  });
});
