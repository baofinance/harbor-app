import { describe, expect, it } from "vitest";
import {
  polTideOwnershipPct,
  supplyBurnedPct,
  tideReserveFromPair,
  treasuryOwnershipPct,
} from "./tidePolOwnership";

describe("treasuryOwnershipPct", () => {
  it("computes percentage of supply held by treasury", () => {
    expect(treasuryOwnershipPct(300n, 1000n)).toBe(30);
  });

  it("returns null for zero supply", () => {
    expect(treasuryOwnershipPct(1n, 0n)).toBeNull();
  });
});

describe("supplyBurnedPct", () => {
  it("computes burned share of total supply", () => {
    expect(supplyBurnedPct(50n, 10_000n)).toBe(0.5);
  });
});

describe("polTideOwnershipPct", () => {
  it("computes TIDE share from LP position", () => {
    const pct = polTideOwnershipPct({
      treasuryLpBalance: 100n,
      lpTotalSupply: 1000n,
      tideReserveInPool: 500n,
      totalTideSupply: 10_000n,
    });
    expect(pct).toBeCloseTo(0.5, 5);
  });
});

describe("tideReserveFromPair", () => {
  const tide = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
  const other = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;

  it("returns reserve for matching token0", () => {
    expect(tideReserveFromPair(tide, other, tide, 123n, 456n)).toBe(123n);
  });

  it("returns reserve for matching token1", () => {
    expect(tideReserveFromPair(other, tide, tide, 123n, 456n)).toBe(456n);
  });

  it("returns null when TIDE is not in pair", () => {
    expect(
      tideReserveFromPair(other, other, tide, 123n, 456n),
    ).toBeNull();
  });
});
