import { describe, expect, it } from "vitest";
import { founderMetricRowHasRevenueShare } from "./founderMetrics";

describe("founderMetricRowHasRevenueShare", () => {
  it("hides pool share that would display as 0.00%", () => {
    expect(founderMetricRowHasRevenueShare({ yieldSharePct: 0 })).toBe(false);
    expect(founderMetricRowHasRevenueShare({ yieldSharePct: 0.004 })).toBe(
      false,
    );
  });

  it("shows pool share at or above 0.01%", () => {
    expect(founderMetricRowHasRevenueShare({ yieldSharePct: 0.01 })).toBe(true);
    expect(founderMetricRowHasRevenueShare({ yieldSharePct: 1.25 })).toBe(true);
  });
});
