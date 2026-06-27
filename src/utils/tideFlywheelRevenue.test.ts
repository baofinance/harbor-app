import { describe, expect, it } from "vitest";
import {
  buildTideFlywheelRevenueEstimate,
  estimateGrossProtocolRevenueUsd,
  sumMaidenPoolYieldUsd,
} from "./tideFlywheelRevenue";

describe("sumMaidenPoolYieldUsd", () => {
  it("sums numeric and string values", () => {
    expect(sumMaidenPoolYieldUsd(["100.5", 50, null, undefined])).toBe(150.5);
  });

  it("ignores invalid values", () => {
    expect(sumMaidenPoolYieldUsd(["bad", "10"])).toBe(10);
  });
});

describe("estimateGrossProtocolRevenueUsd", () => {
  it("grosses up 5% owner share by 20×", () => {
    expect(estimateGrossProtocolRevenueUsd(500, 500)).toBe(10_000);
  });

  it("returns 0 for non-positive pool revenue", () => {
    expect(estimateGrossProtocolRevenueUsd(0)).toBe(0);
    expect(estimateGrossProtocolRevenueUsd(-1)).toBe(0);
  });
});

describe("buildTideFlywheelRevenueEstimate", () => {
  it("returns estimate flag and gross revenue", () => {
    const result = buildTideFlywheelRevenueEstimate(["250", "250"]);
    expect(result.maidenPoolUsd).toBe(500);
    expect(result.estimatedGrossRevenueUsd).toBe(10_000);
    expect(result.isEstimate).toBe(true);
  });
});
