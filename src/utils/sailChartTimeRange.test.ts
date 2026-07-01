import { describe, expect, it } from "vitest";
import {
  filterSailChartPointsByRange,
  sailChartRangeWindowSec,
} from "./sailChartTimeRange";

describe("sailChartTimeRange", () => {
  const day = 24 * 60 * 60;
  const end = 1_700_000_000;
  const points = [
    { timestamp: end - 400 * day },
    { timestamp: end - 200 * day },
    { timestamp: end - 30 * day },
    { timestamp: end - 2 * day },
    { timestamp: end },
  ];

  it("filters to one-year window", () => {
    const filtered = filterSailChartPointsByRange(points, "1Y");
    expect(filtered.length).toBe(4);
    expect(filtered[0]?.timestamp).toBe(end - 200 * day);
  });

  it("filters to one-month window", () => {
    const filtered = filterSailChartPointsByRange(points, "1M");
    expect(filtered.length).toBe(3);
    expect(filtered[0]?.timestamp).toBe(end - 30 * day);
  });

  it("exposes expected range sizes", () => {
    expect(sailChartRangeWindowSec("1Y")).toBe(365 * day);
    expect(sailChartRangeWindowSec("3M")).toBe(90 * day);
  });
});
