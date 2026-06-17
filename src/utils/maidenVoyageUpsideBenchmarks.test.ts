import { describe, expect, it } from "vitest";
import {
  computeUpsideBenchmarks,
  formatTvlBenchmarkLabel,
  formatUsdRange,
} from "./maidenVoyageUpsideBenchmarks";

describe("computeUpsideBenchmarks", () => {
  it("derives market revenue and user earnings at 0.10% share", () => {
    const rows = computeUpsideBenchmarks(0.1);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      tvlUsd: 100_000,
      marketRevenueLowUsd: 5_000,
      marketRevenueHighUsd: 10_000,
      yourEarningsLowUsd: 5,
      yourEarningsHighUsd: 10,
    });
    expect(rows[1]).toMatchObject({
      tvlUsd: 1_000_000,
      yourEarningsLowUsd: 50,
      yourEarningsHighUsd: 100,
    });
    expect(rows[2]).toMatchObject({
      tvlUsd: 10_000_000,
      yourEarningsLowUsd: 500,
      yourEarningsHighUsd: 1_000,
    });
  });

  it("scales user earnings when revenue share changes", () => {
    const rows = computeUpsideBenchmarks(0.2);
    expect(rows[0]!.yourEarningsLowUsd).toBe(10);
    expect(rows[0]!.yourEarningsHighUsd).toBe(20);
  });

  it("returns zero earnings when share is unknown", () => {
    const rows = computeUpsideBenchmarks(null);
    expect(rows[0]!.yourEarningsLowUsd).toBe(0);
    expect(rows[0]!.yourEarningsHighUsd).toBe(0);
    expect(rows[0]!.marketRevenueLowUsd).toBe(5_000);
  });
});

describe("formatUsdRange", () => {
  it("formats benchmark-style ranges", () => {
    expect(formatUsdRange(5_000, 10_000, { approximate: true })).toBe(
      "≈ $5K–10K",
    );
    expect(formatUsdRange(5, 10)).toBe("$5–10");
    expect(formatUsdRange(500, 1_000)).toBe("$500–1K");
  });
});

describe("formatTvlBenchmarkLabel", () => {
  it("labels TVL scenarios", () => {
    expect(formatTvlBenchmarkLabel(100_000)).toBe("$100K TVL");
    expect(formatTvlBenchmarkLabel(1_000_000)).toBe("$1M TVL");
  });
});
