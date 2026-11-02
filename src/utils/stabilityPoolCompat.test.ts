import { describe, expect, it } from "vitest";
import {
  estimateStabilityPoolWithdrawal,
  harborTokenTitle,
  harborTokenWithTitle,
  stabilityPoolShareLabel,
} from "./stabilityPoolCompat";

const wad = 10n ** 18n;

describe("estimateStabilityPoolWithdrawal", () => {
  it("charges the v3 fee only above the fee-free amount", () => {
    const result = estimateStabilityPoolWithdrawal({
      amount: 10n * wad,
      feeRatio: wad / 20n,
      windowOpen: true,
      feeFreeAmount: 4n * wad,
    });
    expect(result.feeAmount).toBe((6n * wad) / 20n);
    expect(result.netAmount).toBe(10n * wad - result.feeAmount);
  });

  it("treats a v2 open window as fully free", () => {
    const result = estimateStabilityPoolWithdrawal({
      amount: 10n * wad,
      feeRatio: wad / 20n,
      windowOpen: true,
    });
    expect(result.feeAmount).toBe(0n);
    expect(result.netAmount).toBe(10n * wad);
  });

  it("charges the whole amount outside the window and caps at headroom", () => {
    const result = estimateStabilityPoolWithdrawal({
      amount: 10n * wad,
      headroom: 4n * wad,
      feeRatio: wad / 20n,
      windowOpen: false,
      feeFreeAmount: 4n * wad,
    });
    expect(result.leaving).toBe(4n * wad);
    expect(result.feeAmount).toBe((4n * wad) / 20n);
  });
});

describe("stabilityPoolShareLabel", () => {
  it("names anchored tokens as stability-pool shares", () => {
    expect(stabilityPoolShareLabel("haEUR2")).toBe("hspEUR2");
    expect(stabilityPoolShareLabel("haETH")).toBe("hspETH");
    expect(stabilityPoolShareLabel("hsSTETH-EUR2")).toBeNull();
  });
});

describe("harbor token titles", () => {
  it("maps the four prefixes", () => {
    expect(harborTokenTitle("haEUR2")).toBe("Harbor Anchored");
    expect(harborTokenTitle("hsSTETH-EUR2")).toBe("Harbor Sail");
    expect(harborTokenTitle("hspEUR2")).toBe("Harbor Stability Pool");
    expect(harborTokenTitle("hyETH")).toBe("Harbor Yield");
    expect(harborTokenWithTitle("hspEUR2")).toBe("hspEUR2 (Harbor Stability Pool)");
  });
});
