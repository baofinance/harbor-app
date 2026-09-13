import { describe, expect, it } from "vitest";
import {
  MAX_UINT256,
  classifyMarketHealthStatus,
  classifyMarketLiquidityStatus,
  formatMarketCrPercent,
  formatMaxMintableUsd,
  MARKET_LOW_LIQUID_USD_THRESHOLD,
} from "./anchorMarketHealth";

describe("anchorMarketHealth", () => {
  it("formats CR without decimals", () => {
    expect(formatMarketCrPercent(10n ** 18n * 14n / 10n)).toBe("140%");
    expect(formatMarketCrPercent(10n ** 18n * 10n)).toBe("1,000%");
  });

  it("formats saturated / inconclusive CR as >1,000%", () => {
    expect(formatMarketCrPercent(MAX_UINT256)).toBe(">1,000%");
    expect(
      formatMarketCrPercent(10n ** 18n * 2n, { inconclusive: true }),
    ).toBe(">1,000%");
  });

  it("formats max mintable as whole dollars", () => {
    expect(formatMaxMintableUsd(10.7)).toBe("$11");
    expect(formatMaxMintableUsd(100000.4)).toBe("$100,000");
    expect(formatMaxMintableUsd(undefined)).toBe("—");
  });

  it("tags low liquid vs liquid from capacity", () => {
    expect(classifyMarketLiquidityStatus(10)).toBe("low_liquid");
    expect(
      classifyMarketLiquidityStatus(MARKET_LOW_LIQUID_USD_THRESHOLD),
    ).toBe("liquid");
    expect(classifyMarketLiquidityStatus(100000)).toBe("liquid");
    expect(classifyMarketLiquidityStatus(undefined)).toBe("unknown");
  });

  it("never calls missing CR healthy", () => {
    expect(classifyMarketHealthStatus(undefined, 10n ** 18n)).toBe("unknown");
  });

  it("classifies without minter min CR using 100% floor", () => {
    const cr = (10n ** 18n * 15n) / 10n;
    expect(classifyMarketHealthStatus(cr, undefined, 100000)).toBe("healthy");
  });

  it("treats saturated CR as inconclusive when low liquid", () => {
    expect(classifyMarketHealthStatus(MAX_UINT256, undefined, 100000)).toBe(
      "healthy",
    );
    expect(classifyMarketHealthStatus(MAX_UINT256, undefined, 10)).toBe(
      "inconclusive",
    );
  });

  it("marks thin capacity with safe CR as inconclusive", () => {
    const min = 10n ** 18n; // 100%
    const highCr = (min * 15n) / 10n;
    expect(classifyMarketHealthStatus(highCr, min, 0)).toBe("stressed");
    expect(classifyMarketHealthStatus(highCr, min, 10)).toBe("inconclusive");
    expect(classifyMarketHealthStatus(highCr, min, 100000)).toBe("healthy");
  });
});
