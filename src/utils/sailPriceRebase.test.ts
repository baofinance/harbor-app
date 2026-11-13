import { describe, expect, it } from "vitest";
import type { SailPerpBenchmarkResult } from "@/utils/sailPerpBenchmark";
import {
  STETH_EUR_SAIL_REBASE,
  rebaseSailBenchmarkReturns,
  rebaseSailChartHsPrices,
  rebaseSailStatePrices,
} from "@/utils/sailPriceRebase";

function benchmark(
  points: SailPerpBenchmarkResult["points"],
): SailPerpBenchmarkResult {
  return {
    points,
    perpReturnPct: -38,
    sailGrossReturnPct: -95,
    sailNetReturnPct: -95.57,
    openingLeverageRatio: 2,
    liquidatedAt: null,
    costs: {
      tradingFeesUsd: 1,
      slippageUsd: 1,
      fundingUsd: 1,
      liquidationImpactUsd: 0,
      sailMintFeeUsd: 2,
      sailRedeemFeeUsd: 4,
    },
  };
}

describe("sailPriceRebase", () => {
  it("puts today's price × supply on the pre-incident share count", () => {
    const supplyBefore = 10_762.406044992895027729;
    const priceBefore = 0.826780103227000218;
    const supplyAfter = 97_769.688696788525638751;
    const priceAfter = 0.039631887639505445;
    const bookRatio = (priceAfter * supplyAfter) / (priceBefore * supplyBefore);
    expect(STETH_EUR_SAIL_REBASE.priceScale).toBeCloseTo(
      bookRatio * (priceBefore / priceAfter),
      6,
    );
    expect(priceAfter * STETH_EUR_SAIL_REBASE.priceScale).toBeCloseTo(
      (priceAfter * supplyAfter) / supplyBefore,
      6,
    );
  });

  it("scales stETH–EUR unit prices from the recap onward", () => {
    const states = rebaseSailStatePrices("steth-eur", [
      {
        timestamp: STETH_EUR_SAIL_REBASE.fromTimestamp - 60,
        sailPriceUsd: 0.04,
        navInPeg: 0.034,
      },
      {
        timestamp: STETH_EUR_SAIL_REBASE.fromTimestamp,
        sailPriceUsd: 0.0396,
        navInPeg: 0.034,
      },
    ]);

    expect(states[0]!.sailPriceUsd).toBeCloseTo(0.04);
    expect(states[1]!.sailPriceUsd).toBeCloseTo(
      0.0396 * STETH_EUR_SAIL_REBASE.priceScale,
    );
    expect(states[1]!.navInPeg).toBeCloseTo(
      0.034 * STETH_EUR_SAIL_REBASE.priceScale,
    );
  });

  it("leaves other markets on the raw unit price", () => {
    const states = rebaseSailStatePrices("fxusd-eur", [
      {
        timestamp: STETH_EUR_SAIL_REBASE.fromTimestamp,
        sailPriceUsd: 0.04,
      },
    ]);
    expect(states[0]!.sailPriceUsd).toBe(0.04);
  });

  it("appends the recovered chart price when history ends before the recap", () => {
    const points = rebaseSailChartHsPrices(
      "steth-eur",
      [
        { timestamp: STETH_EUR_SAIL_REBASE.fromTimestamp - 3600, hsPriceUsd: 0.04 },
      ],
      STETH_EUR_SAIL_REBASE.fromTimestamp + 60,
    );

    expect(points).toHaveLength(2);
    expect(points[1]!.timestamp).toBe(STETH_EUR_SAIL_REBASE.fromTimestamp);
    expect(points[1]!.hsPriceUsd).toBeCloseTo(0.04 * STETH_EUR_SAIL_REBASE.priceScale);
  });

  it("steps Sail net up at the recap when the last candle is still pre-mint", () => {
    const priorTimestamp = STETH_EUR_SAIL_REBASE.fromTimestamp - 3600;
    const result = rebaseSailBenchmarkReturns(
      "steth-eur",
      benchmark([
        {
          timestamp: priorTimestamp,
          perpEquityUsd: 620,
          perpReturnPct: -38,
          sailReturnPct: -95.57,
          leverageRatio: 2,
        },
      ]),
      STETH_EUR_SAIL_REBASE.fromTimestamp + 60,
    );

    expect(result.points).toHaveLength(2);
    expect(result.points[1]!.timestamp).toBe(STETH_EUR_SAIL_REBASE.fromTimestamp);
    expect(result.points[1]!.perpReturnPct).toBe(-38);
    const recovered = ((1 - 0.9557) * STETH_EUR_SAIL_REBASE.priceScale - 1) * 100;
    expect(result.points[1]!.sailReturnPct).toBeCloseTo(recovered);
    expect(result.sailNetReturnPct).toBeCloseTo(recovered);
    expect(result.sailGrossReturnPct).toBeGreaterThan(-95);
    expect(result.costs.sailRedeemFeeUsd).toBeCloseTo(
      4 * STETH_EUR_SAIL_REBASE.priceScale,
    );
    expect(result.costs.sailMintFeeUsd).toBe(2);
  });

  it("does not scale a headline that already includes a post-recap hour", () => {
    const result = rebaseSailBenchmarkReturns(
      "steth-eur",
      benchmark([
        {
          timestamp: STETH_EUR_SAIL_REBASE.fromTimestamp - 3600,
          perpEquityUsd: 620,
          perpReturnPct: -38,
          sailReturnPct: -95.57,
          leverageRatio: 2,
        },
        {
          timestamp: STETH_EUR_SAIL_REBASE.fromTimestamp + 3600,
          perpEquityUsd: 610,
          perpReturnPct: -39,
          sailReturnPct: -86.9,
          leverageRatio: 2,
        },
      ]),
      STETH_EUR_SAIL_REBASE.fromTimestamp + 4000,
    );

    expect(result.sailNetReturnPct).toBe(-95.57);
    expect(result.points.map((point) => point.timestamp)).toEqual([
      STETH_EUR_SAIL_REBASE.fromTimestamp - 3600,
      STETH_EUR_SAIL_REBASE.fromTimestamp,
      STETH_EUR_SAIL_REBASE.fromTimestamp + 3600,
    ]);
    expect(result.points[2]!.sailReturnPct).toBe(-86.9);
  });
});
