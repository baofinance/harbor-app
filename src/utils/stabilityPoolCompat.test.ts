import { describe, expect, it } from "vitest";
import {
  clampWithdrawToPoolMinimum,
  estimateStabilityPoolWithdrawal,
  harborTokenTitle,
  harborTokenWithTitle,
  immediatePoolWithdrawCap,
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

describe("immediatePoolWithdrawCap", () => {
  it("keeps one token in the pool on a full exit", () => {
    const balance = 2559360260000000000n;
    expect(immediatePoolWithdrawCap(balance, balance, wad)).toBe(
      1559360260000000000n,
    );
  });

  it("leaves a partial withdrawal that stays above the floor", () => {
    const balance = 5n * wad;
    expect(immediatePoolWithdrawCap(wad, balance, wad)).toBe(wad);
  });
});

describe("clampWithdrawToPoolMinimum", () => {
  it("reduces a full exit to the amount that can leave", () => {
    const balance = 2559360260000000000n;
    expect(
      clampWithdrawToPoolMinimum({
        requested: balance,
        balance,
        totalSupply: balance,
        minTotalSupply: wad,
      }),
    ).toEqual({ amount: 1559360260000000000n, blocked: false });
  });

  it("blocks an immediate withdraw when the pool is already at the floor", () => {
    expect(
      clampWithdrawToPoolMinimum({
        requested: wad,
        balance: wad,
        totalSupply: wad,
        minTotalSupply: wad,
      }),
    ).toEqual({ amount: 0n, blocked: true });
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
