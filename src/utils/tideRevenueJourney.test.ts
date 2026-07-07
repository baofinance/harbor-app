import { describe, expect, it } from "vitest";
import {
  deriveAllStageVisuals,
  deriveRevenueAllocation,
  deriveStageVisualState,
  progressTowardTarget,
} from "./tideRevenueJourney";
import type { TideFlywheelMetrics } from "@/hooks/useTideFlywheelMetrics";

function baseMetrics(
  overrides: Partial<TideFlywheelMetrics> = {},
): Pick<
  TideFlywheelMetrics,
  "activeStage" | "treasury" | "pol" | "buyback" | "lifetimeRevenueUsd"
> {
  return {
    activeStage: "treasury",
    lifetimeRevenueUsd: 4000,
    buyback: { tideTokens: 0, usd: 1000 },
    treasury: {
      ownershipPct: 10,
      targetPct: 30,
      targetReached: false,
    },
    pol: {
      ownershipPct: 0,
      targetPct: 15,
      targetReached: false,
    },
    ...overrides,
  };
}

describe("deriveStageVisualState", () => {
  it("marks buyback complete when buyback usd exists", () => {
    expect(deriveStageVisualState("buyback", baseMetrics())).toBe("complete");
  });

  it("marks treasury active when below target", () => {
    expect(deriveStageVisualState("treasury", baseMetrics())).toBe("active");
  });

  it("marks treasury complete when target reached", () => {
    expect(
      deriveStageVisualState(
        "treasury",
        baseMetrics({
          activeStage: "pol",
          treasury: {
            ownershipPct: 99.5,
            targetPct: 30,
            targetReached: true,
          },
        }),
      ),
    ).toBe("complete");
  });

  it("marks pol future while treasury stage active", () => {
    expect(deriveStageVisualState("pol", baseMetrics())).toBe("future");
  });

  it("marks pol active when treasury target met", () => {
    expect(
      deriveStageVisualState(
        "pol",
        baseMetrics({
          activeStage: "pol",
          treasury: {
            ownershipPct: 35,
            targetPct: 30,
            targetReached: true,
          },
          pol: { ownershipPct: 0.5, targetPct: 15, targetReached: false },
        }),
      ),
    ).toBe("active");
  });

  it("marks burn active only in burn stage", () => {
    expect(
      deriveStageVisualState(
        "burn",
        baseMetrics({
          activeStage: "burn",
          treasury: {
            ownershipPct: 35,
            targetPct: 30,
            targetReached: true,
          },
          pol: { ownershipPct: 20, targetPct: 15, targetReached: true },
        }),
      ),
    ).toBe("active");
  });
});

describe("deriveAllStageVisuals", () => {
  it("returns four stages in order", () => {
    const visuals = deriveAllStageVisuals(baseMetrics());
    expect(visuals.map((v) => v.id)).toEqual([
      "buyback",
      "treasury",
      "pol",
      "burn",
    ]);
  });
});

describe("deriveRevenueAllocation", () => {
  it("allocates to treasury during treasury stage", () => {
    expect(deriveRevenueAllocation("treasury")).toEqual({
      todayLabel: "Treasury",
      todayPct: 100,
      futureLabel: "Protocol-Owned Liquidity",
    });
  });

  it("allocates to POL during pol stage", () => {
    expect(deriveRevenueAllocation("pol")).toEqual({
      todayLabel: "Protocol-Owned Liquidity",
      todayPct: 100,
      futureLabel: "Burn TIDE (after POL reaches 15%)",
    });
  });

  it("allocates to burn during burn stage", () => {
    expect(deriveRevenueAllocation("burn")).toEqual({
      todayLabel: "Burn TIDE",
      todayPct: 100,
      futureLabel: null,
    });
  });
});

describe("progressTowardTarget", () => {
  it("computes progress toward target", () => {
    expect(progressTowardTarget(15, 30)).toBe(50);
    expect(progressTowardTarget(99.5, 30)).toBe(100);
  });

  it("handles null current", () => {
    expect(progressTowardTarget(null, 30)).toBe(0);
  });
});
