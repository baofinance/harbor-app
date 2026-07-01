import { describe, expect, it } from "vitest";
import {
  buildSailMarketChartPoints,
  getSailMarketChartConfig,
  resamplePriceSeries,
} from "./sailMarketChartSeries";
import type { DefinedMarket } from "@/config/markets";

const hsStethEurMarket = {
  pegTarget: "eur",
  collateral: { symbol: "wstETH" },
  leveragedToken: { symbol: "hsSTETH-EUR", name: "Harbor Sail stETH-EUR" },
} as DefinedMarket;

describe("sailMarketChartSeries", () => {
  it("resamplePriceSeries advances through Chainlink rounds over time", () => {
    const now = Math.floor(Date.now() / 1000);
    const chainlink = Array.from({ length: 10 }, (_, i) => ({
      timestamp: now - (9 - i) * 3600,
      priceUsd: 1500 + i * 10,
    }));
    const timestamps = Array.from({ length: 10 }, (_, i) => now - (9 - i) * 3600);

    const resampled = resamplePriceSeries(timestamps, chainlink);
    expect(resampled[0]).toBeCloseTo(1500, 0);
    expect(resampled[9]).toBeCloseTo(1590, 0);
    expect(new Set(resampled.map((v) => v.toFixed(0))).size).toBeGreaterThan(1);
  });

  it("buildSailMarketChartPoints varies ETH/EUR ratio with oracle history", () => {
    const config = getSailMarketChartConfig(hsStethEurMarket);
    const baseTs = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

    const mergedSubgraph = Array.from({ length: 8 }, (_, i) => ({
      timestamp: baseTs + i * 24 * 3600,
      priceUSD: 0.35,
      collateralPriceUSD: 1500 + i * 25,
      source: "hourly" as const,
    }));

    const ethHistory = mergedSubgraph.map((p, i) => ({
      timestamp: p.timestamp,
      priceUsd: 1500 + i * 25,
    }));
    const eurHistory = mergedSubgraph.map((p) => ({
      timestamp: p.timestamp,
      priceUsd: 1.08,
    }));

    const points = buildSailMarketChartPoints(config, mergedSubgraph, {
      ETH: ethHistory,
      EUR: eurHistory,
    });

    const ratios = points
      .map((p) => p.defaultRatio)
      .filter((v) => Number.isFinite(v));
    expect(ratios.length).toBeGreaterThan(1);
    expect(Math.min(...ratios)).toBeLessThan(Math.max(...ratios));
  });
});
