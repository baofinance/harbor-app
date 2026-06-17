import { describe, expect, it } from "vitest";
import {
  estimateMaidenVoyageOwnershipPct,
  estimateMaidenVoyageYieldSharePct,
  formatMaidenVoyageOwnershipPct,
  formatMaidenVoyageYieldSharePct,
} from "./maidenVoyageYieldShareEstimate";

describe("estimateMaidenVoyageOwnershipPct", () => {
  it("returns voyage ownership for deposit vs cap", () => {
    expect(
      estimateMaidenVoyageOwnershipPct({ depositUsd: 1_000, capUsd: 50_000 }),
    ).toBe(2);
  });

  it("caps at 100% when deposit exceeds cap", () => {
    expect(
      estimateMaidenVoyageOwnershipPct({ depositUsd: 60_000, capUsd: 50_000 }),
    ).toBe(100);
  });

  it("returns null for invalid inputs", () => {
    expect(
      estimateMaidenVoyageOwnershipPct({ depositUsd: 0, capUsd: 50_000 }),
    ).toBeNull();
  });
});

describe("founding position revenue share", () => {
  it("combines 2% ownership with 5% pool to 0.10% revenue share", () => {
    const ownership = estimateMaidenVoyageOwnershipPct({
      depositUsd: 1_000,
      capUsd: 50_000,
    });
    const revenueShare = estimateMaidenVoyageYieldSharePct({
      depositUsd: 1_000,
      capUsd: 50_000,
      yieldRevSharePct: 5,
    });

    expect(ownership).toBe(2);
    expect(revenueShare).toBeCloseTo(0.1, 5);
    expect(formatMaidenVoyageOwnershipPct(ownership)).toBe("2.00%");
    expect(formatMaidenVoyageYieldSharePct(revenueShare)).toBe("0.10%");
  });
});
