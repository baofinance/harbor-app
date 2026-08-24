import { describe, expect, it } from "vitest";
import {
  computePegChartPeriodChanges,
  computePegChartRangeChangePct,
  filterPegChartPointsByRange,
  liveUsdPriceForPegAsset,
  pegPriceAtOrBefore,
  pegTargetToAssetKey,
  startOfYearTimestamp,
} from "./pegAssetChart";

describe("pegAssetChart", () => {
  it("maps peg targets to asset keys", () => {
    expect(pegTargetToAssetKey("ETH")).toBe("ETH");
    expect(pegTargetToAssetKey("bitcoin")).toBe("BTC");
    expect(pegTargetToAssetKey("Euro")).toBe("EUR");
    expect(pegTargetToAssetKey("USD")).toBe("USD");
    expect(pegTargetToAssetKey("PLTR")).toBeNull();
  });

  it("resolves live USD prices", () => {
    const prices = {
      ethPrice: 3000,
      btcPrice: 60000,
      eurPrice: 1.08,
      goldPrice: 2000,
      silverPrice: 25,
    };
    expect(liveUsdPriceForPegAsset("ETH", prices)).toBe(3000);
    expect(liveUsdPriceForPegAsset("USD", prices)).toBe(1);
  });

  it("computes range change", () => {
    expect(
      computePegChartRangeChangePct([
        { priceUsd: 100 },
        { priceUsd: 110 },
      ]),
    ).toBeCloseTo(10);
  });

  it("computes period changes with YTD from Jan 1 baseline", () => {
    const ytdStart = startOfYearTimestamp(1_700_000_000);
    const points = [
      { timestamp: ytdStart - 86400, priceUsd: 90 },
      { timestamp: ytdStart, priceUsd: 100 },
      { timestamp: ytdStart + 86400, priceUsd: 105 },
      { timestamp: 1_700_000_000 - 3600, priceUsd: 108 },
      { timestamp: 1_700_000_000 - 7200, priceUsd: 106 },
    ];
    const changes = computePegChartPeriodChanges(points, 110, 1_700_000_000);
    expect(changes.changeYtdPct).toBeCloseTo(10);
    expect(changes.change1hPct).toBeCloseTo((110 - 108) / 108 * 100);
    expect(pegPriceAtOrBefore(points, ytdStart)).toBe(100);
  });

  it("filters peg chart points against wall-clock now", () => {
    const now = 1_700_000_000;
    const points = [
      { timestamp: now - 86400 * 100, priceUsd: 1 },
      { timestamp: now - 86400 * 10, priceUsd: 2 },
      { timestamp: now - 3600, priceUsd: 3 },
    ];
    const filtered = filterPegChartPointsByRange(points, "1M", now);
    expect(filtered).toHaveLength(2);
    expect(filtered[0]?.timestamp).toBe(now - 86400 * 10);
  });
});
