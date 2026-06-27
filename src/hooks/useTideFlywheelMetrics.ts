"use client";

import { useMemo } from "react";
import {
  TIDE_FLYWHEEL_CONFIG,
  type TideFlywheelStage,
} from "@/config/tideFlywheel";
import { useTideFlywheelOnChain } from "@/hooks/useTideFlywheelOnChain";
import { useTideFlywheelRevenue } from "@/hooks/useTideFlywheelRevenue";
import { supplyBurnedPct } from "@/utils/tidePolOwnership";
import {
  deriveFlywheelStage,
  isPolTargetReached,
  isTreasuryTargetReached,
} from "@/utils/tideFlywheelStage";

export type TideFlywheelMetrics = {
  lifetimeRevenueUsd: number | null;
  buyback: { tideTokens: number; usd: number };
  treasury: {
    ownershipPct: number | null;
    targetPct: number;
    targetReached: boolean;
  };
  pol: {
    ownershipPct: number | null;
    targetPct: number;
    targetReached: boolean;
  };
  burn: { supplyBurnedPct: number | null };
  activeStage: TideFlywheelStage;
  isLoading: boolean;
  isEstimate: boolean;
  tideTokenConfigured: boolean;
  polLpConfigured: boolean;
  burnConfigured: boolean;
};

function resolveStaticBurnPct(totalSupply: bigint | null): number | null {
  const { supplyBurnedPct: staticPct, tideTokensBurned } =
    TIDE_FLYWHEEL_CONFIG.staticBurn;

  if (staticPct > 0) return staticPct;

  if (
    tideTokensBurned > 0 &&
    totalSupply != null &&
    totalSupply > 0n
  ) {
    const burnedWei = BigInt(
      Math.trunc(tideTokensBurned * 10 ** TIDE_FLYWHEEL_CONFIG.tideDecimals),
    );
    return supplyBurnedPct(burnedWei, totalSupply);
  }

  if (totalSupply != null) return 0;
  return staticPct > 0 ? staticPct : null;
}

export function useTideFlywheelMetrics(): TideFlywheelMetrics {
  const revenue = useTideFlywheelRevenue();
  const onChain = useTideFlywheelOnChain();

  return useMemo(() => {
    const lifetimeRevenueUsd =
      revenue.estimate?.estimatedGrossRevenueUsd ?? null;

    const buybackUsd =
      TIDE_FLYWHEEL_CONFIG.staticBuyback.usd > 0
        ? TIDE_FLYWHEEL_CONFIG.staticBuyback.usd
        : lifetimeRevenueUsd != null
          ? (lifetimeRevenueUsd *
              TIDE_FLYWHEEL_CONFIG.buybackShareOfRevenuePct) /
            100
          : 0;

    const treasuryTarget = TIDE_FLYWHEEL_CONFIG.targets.treasuryOwnershipPct;
    const polTarget = TIDE_FLYWHEEL_CONFIG.targets.polOwnershipPct;

    const activeStage = deriveFlywheelStage(
      onChain.treasuryOwnershipPct,
      onChain.polOwnershipPct,
    );

    const burnSupplyPct =
      onChain.supplyBurnedPct ??
      (onChain.tideTokenConfigured
        ? resolveStaticBurnPct(onChain.totalSupply)
        : null);

    return {
      lifetimeRevenueUsd,
      buyback: {
        tideTokens: TIDE_FLYWHEEL_CONFIG.staticBuyback.tideTokens,
        usd: buybackUsd,
      },
      treasury: {
        ownershipPct: onChain.treasuryOwnershipPct,
        targetPct: treasuryTarget,
        targetReached: isTreasuryTargetReached(onChain.treasuryOwnershipPct),
      },
      pol: {
        ownershipPct: onChain.polOwnershipPct,
        targetPct: polTarget,
        targetReached: isPolTargetReached(onChain.polOwnershipPct),
      },
      burn: {
        supplyBurnedPct: burnSupplyPct,
      },
      activeStage,
      isLoading: revenue.isLoading || onChain.isLoading,
      isEstimate: revenue.estimate?.isEstimate ?? true,
      tideTokenConfigured: onChain.tideTokenConfigured,
      polLpConfigured: onChain.polLpConfigured,
      burnConfigured: onChain.burnConfigured,
    };
  }, [onChain, revenue.estimate, revenue.isLoading]);
}
