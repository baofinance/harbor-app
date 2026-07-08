import { describe, expect, it } from "vitest";
import {
  buildSailMarketChartPoints,
  computeSailChartWindowPerformance,
  getSailMarketChartConfig,
  resamplePriceSeries,
  sailChartHasHsPriceOverlay,
  toRechartsSailChartData,
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

  it("carries hs token USD prices onto the chart timeline", () => {
    const config = getSailMarketChartConfig(hsStethEurMarket);
    const mergedSubgraph = [
      {
        timestamp: 1_700_000_000,
        priceUSD: 1.2,
        collateralPriceUSD: 1500,
        source: "hourly" as const,
      },
      {
        timestamp: 1_700_003_600,
        priceUSD: 1.25,
        collateralPriceUSD: 1510,
        source: "hourly" as const,
      },
    ];

    const points = buildSailMarketChartPoints(config, mergedSubgraph, {
      ETH: mergedSubgraph.map((p) => ({ timestamp: p.timestamp, priceUsd: p.collateralPriceUSD })),
      EUR: mergedSubgraph.map((p) => ({ timestamp: p.timestamp, priceUsd: 1.08 })),
    });

    expect(points.every((p) => p.hsPriceUsd === 1.2 || p.hsPriceUsd === 1.25)).toBe(true);
    expect(sailChartHasHsPriceOverlay(points)).toBe(true);
    expect(toRechartsSailChartData(points)[0]?.hsPriceUsdAbs).toBe(1.2);
  });

  it("indexes both series to range start when comparing performance", () => {
    const points = [
      {
        timestamp: 1,
        defaultRatio: 100,
        longUsd: 100,
        shortUsd: 1,
        hsPriceUsd: 10,
      },
      {
        timestamp: 2,
        defaultRatio: 110,
        longUsd: 110,
        shortUsd: 1,
        hsPriceUsd: 13,
      },
    ];

    const compared = toRechartsSailChartData(points, true);
    expect(compared[0]?.defaultRatio).toBeCloseTo(0, 5);
    expect(compared[0]?.hsPriceUsd).toBeCloseTo(0, 5);
    expect(compared[1]?.defaultRatio).toBeCloseTo(10, 5);
    expect(compared[1]?.hsPriceUsd).toBeCloseTo(30, 5);
    expect(compared[1]?.defaultRatioAbs).toBe(110);
    expect(compared[1]?.hsPriceUsdAbs).toBe(13);
  });

  it("computes window performance from range start to latest point", () => {
    const points = [
      {
        timestamp: 1,
        defaultRatio: 100,
        longUsd: 100,
        shortUsd: 1,
        hsPriceUsd: 10,
      },
      {
        timestamp: 2,
        defaultRatio: 110,
        longUsd: 110,
        shortUsd: 1,
        hsPriceUsd: 13,
      },
    ];

    const performance = computeSailChartWindowPerformance(points);
    expect(performance.marketPerformancePct).toBeCloseTo(10, 5);
    expect(performance.leverageTokenPerformancePct).toBeCloseTo(30, 5);
    expect(performance.leverageTokenVsMarketPct).toBeCloseTo(20, 5);
  });
});
