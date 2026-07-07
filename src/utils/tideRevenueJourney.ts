import type { TideFlywheelStage } from "@/config/tideFlywheel";
import type { TideFlywheelMetrics } from "@/hooks/useTideFlywheelMetrics";

export type JourneyStageId = "buyback" | "treasury" | "pol" | "burn";

export type JourneyStageVisualState = "future" | "active" | "complete";

export type JourneyStageVisual = {
  id: JourneyStageId;
  state: JourneyStageVisualState;
};

export type RevenueAllocation = {
  todayLabel: string;
  todayPct: number;
  futureLabel: string | null;
};

export type JourneyStageStatusLabel = "Complete" | "Active" | "Upcoming";

const STAGE_ORDER: JourneyStageId[] = ["buyback", "treasury", "pol", "burn"];

export function deriveStageVisualState(
  stageId: JourneyStageId,
  metrics: Pick<
    TideFlywheelMetrics,
    "activeStage" | "treasury" | "pol" | "buyback" | "lifetimeRevenueUsd"
  >,
): JourneyStageVisualState {
  const { activeStage, treasury, pol, buyback, lifetimeRevenueUsd } = metrics;

  switch (stageId) {
    case "buyback":
      return buyback.usd > 0 || (lifetimeRevenueUsd ?? 0) > 0
        ? "complete"
        : "active";

    case "treasury":
      if (treasury.targetReached || activeStage === "pol" || activeStage === "burn") {
        return "complete";
      }
      if (activeStage === "treasury") return "active";
      return "future";

    case "pol":
      if (pol.targetReached || activeStage === "burn") return "complete";
      if (activeStage === "pol") return "active";
      return "future";

    case "burn":
      if (activeStage === "burn") return "active";
      return "future";

    default:
      return "future";
  }
}

export function deriveAllStageVisuals(
  metrics: Pick<
    TideFlywheelMetrics,
    "activeStage" | "treasury" | "pol" | "buyback" | "lifetimeRevenueUsd"
  >,
): JourneyStageVisual[] {
  return STAGE_ORDER.map((id) => ({
    id,
    state: deriveStageVisualState(id, metrics),
  }));
}

export function deriveStageStatusLabel(
  stageId: JourneyStageId,
  visualState: JourneyStageVisualState,
): JourneyStageStatusLabel | null {
  if (visualState === "complete") return "Complete";
  if (visualState === "active") return "Active";
  if (visualState === "future") return "Upcoming";
  return null;
}

export function deriveRevenueAllocation(
  activeStage: TideFlywheelStage,
): RevenueAllocation {
  switch (activeStage) {
    case "treasury":
      return {
        todayLabel: "Treasury",
        todayPct: 100,
        futureLabel: "Protocol-Owned Liquidity",
      };
    case "pol":
      return {
        todayLabel: "Protocol-Owned Liquidity",
        todayPct: 100,
        futureLabel: "Burn TIDE (after POL reaches 15%)",
      };
    case "burn":
      return {
        todayLabel: "Burn TIDE",
        todayPct: 100,
        futureLabel: null,
      };
    default:
      return {
        todayLabel: "Treasury",
        todayPct: 100,
        futureLabel: "Protocol-Owned Liquidity",
      };
  }
}

/** Progress bar fill as % of target (capped at 100 for display). */
export function progressTowardTarget(
  current: number | null | undefined,
  targetPct: number,
): number {
  if (current == null || targetPct <= 0) return 0;
  return Math.min(100, Math.max(0, (current / targetPct) * 100));
}
