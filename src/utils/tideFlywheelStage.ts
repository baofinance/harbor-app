import type { TideFlywheelStage } from "@/config/tideFlywheel";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";

export function isTreasuryTargetReached(
  treasuryOwnershipPct: number | null,
  targetPct: number = TIDE_FLYWHEEL_CONFIG.targets.treasuryOwnershipPct,
): boolean {
  return treasuryOwnershipPct != null && treasuryOwnershipPct >= targetPct;
}

export function isPolTargetReached(
  polOwnershipPct: number | null,
  targetPct: number = TIDE_FLYWHEEL_CONFIG.targets.polOwnershipPct,
): boolean {
  return polOwnershipPct != null && polOwnershipPct >= targetPct;
}

export function deriveFlywheelStage(
  treasuryOwnershipPct: number | null,
  polOwnershipPct: number | null,
): TideFlywheelStage {
  const treasuryTarget = TIDE_FLYWHEEL_CONFIG.targets.treasuryOwnershipPct;
  const polTarget = TIDE_FLYWHEEL_CONFIG.targets.polOwnershipPct;

  if (treasuryOwnershipPct == null || treasuryOwnershipPct < treasuryTarget) {
    return "treasury";
  }
  if (polOwnershipPct == null || polOwnershipPct < polTarget) {
    return "pol";
  }
  return "burn";
}
