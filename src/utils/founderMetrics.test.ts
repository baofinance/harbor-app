import { describe, expect, it } from "vitest";
import {
  deriveFounderWalletMetric,
  founderMetricRowHasGenesisDeposit,
  founderMetricRowHasRevenueShare,
} from "./founderMetrics";

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

describe("founderMetricRowHasGenesisDeposit", () => {
  it("is false when there is no counted deposit and ownership rounds to 0%", () => {
    expect(
      founderMetricRowHasGenesisDeposit({
        depositCountedUsd: 0,
        ownershipSharePct: 0.004,
      }),
    ).toBe(false);
  });

  it("is true when counted deposit or ownership is non-zero", () => {
    expect(
      founderMetricRowHasGenesisDeposit({
        depositCountedUsd: 500,
        ownershipSharePct: 0,
      }),
    ).toBe(true);
    expect(
      founderMetricRowHasGenesisDeposit({
        depositCountedUsd: 0,
        ownershipSharePct: 1.25,
      }),
    ).toBe(true);
  });
});

describe("deriveFounderWalletMetric", () => {
  it("does not assign boost when the wallet never deposited", () => {
    const result = deriveFounderWalletMetric({
      wallet: "0xabc",
      cumulativeYieldUSD: 1000,
      paidUSD: 0,
      participants: [
        {
          user: "0xabc",
          maidenVoyageBoostMultiplier: "5",
          maidenVoyageDepositCountedUSD: "0",
          finalMaidenVoyageOwnershipShare: "0",
        },
      ],
    });

    expect(result.boostMultiplier).toBeNull();
    expect(result.depositCountedUsd).toBe(0);
  });
});
