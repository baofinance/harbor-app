import { maidenVoyageCapUsd } from "@/config/maidenVoyageCap";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";

/** Hypothetical deposit for pre-deposit yield-share estimates on the active voyage card. */
export const MAIDEN_VOYAGE_HYPOTHETICAL_DEPOSIT_USD = 1_000;

/**
 * Estimated yield share (% of total market revenue) for a deposit against the USD cap.
 * Example: $1k on a $100k cap with a 5% owner pool → 0.05%.
 */
export function estimateMaidenVoyageYieldSharePct({
  depositUsd,
  capUsd,
  yieldRevSharePct,
}: {
  depositUsd: number;
  capUsd: number | null | undefined;
  yieldRevSharePct: number | null | undefined;
}): number | null {
  if (
    capUsd == null ||
    capUsd <= 0 ||
    yieldRevSharePct == null ||
    yieldRevSharePct <= 0 ||
    !Number.isFinite(depositUsd) ||
    depositUsd <= 0
  ) {
    return null;
  }

  const ownershipFraction = Math.min(1, depositUsd / capUsd);
  return ownershipFraction * yieldRevSharePct;
}

/**
 * Voyage ownership (% of USD cap) for a deposit.
 * Example: $1k on a $50k cap → 2.0%.
 */
export function estimateMaidenVoyageOwnershipPct({
  depositUsd,
  capUsd,
}: {
  depositUsd: number;
  capUsd: number | null | undefined;
}): number | null {
  if (
    capUsd == null ||
    capUsd <= 0 ||
    !Number.isFinite(depositUsd) ||
    depositUsd <= 0
  ) {
    return null;
  }

  return Math.min(100, (depositUsd / capUsd) * 100);
}

export function formatMaidenVoyageOwnershipPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct) || pct <= 0) return "—";
  if (pct >= 10) return `${pct.toFixed(1)}%`;
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}

export function formatMaidenVoyageYieldSharePct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct) || pct <= 0) return "—";
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  if (pct >= 0.001) return `${pct.toFixed(3)}%`;
  return `${pct.toFixed(4)}%`;
}

export function resolveMaidenVoyageCapUsdForEstimate({
  genesisAddress,
  capTotalUsd,
}: {
  genesisAddress?: string | null;
  capTotalUsd: number;
}): number | null {
  return (
    maidenVoyageCapUsd(genesisAddress?.toLowerCase() ?? null) ??
    (capTotalUsd > 0 ? capTotalUsd : null)
  );
}

export function resolveMaidenVoyageYieldShareLabel({
  capDisplay,
  genesisAddress,
  yieldRevSharePct,
  userDepositUsd,
}: {
  capDisplay: GenesisVoyageCapDisplay;
  genesisAddress?: string;
  yieldRevSharePct?: number | null;
  userDepositUsd?: number | null;
}): { label: string; caption: string } {
  const pct = resolveMaidenVoyageYieldSharePct({
    capDisplay,
    genesisAddress,
    yieldRevSharePct,
    userDepositUsd,
  });

  const depositUsdForEstimate =
    capDisplay.countedUsd > 0
      ? capDisplay.countedUsd
      : capDisplay.ownershipShare > 0
        ? capDisplay.ownershipShare *
          (resolveMaidenVoyageCapUsdForEstimate({
            genesisAddress,
            capTotalUsd: capDisplay.capTotalUsd,
          }) ?? 0)
        : userDepositUsd != null && userDepositUsd > 0
          ? userDepositUsd
          : null;

  return {
    label: formatMaidenVoyageYieldSharePct(pct),
    caption:
      depositUsdForEstimate != null && depositUsdForEstimate > 0
        ? "Based on your deposit"
        : "With $1,000 deposit",
  };
}

/** Numeric Est. Your Share % for calculator defaults (same logic as label resolver). */
export function resolveMaidenVoyageYieldSharePct({
  capDisplay,
  genesisAddress,
  yieldRevSharePct,
  userDepositUsd,
}: {
  capDisplay: GenesisVoyageCapDisplay;
  genesisAddress?: string;
  yieldRevSharePct?: number | null;
  userDepositUsd?: number | null;
}): number | null {
  const capUsd = resolveMaidenVoyageCapUsdForEstimate({
    genesisAddress,
    capTotalUsd: capDisplay.capTotalUsd,
  });
  const revPct = yieldRevSharePct ?? capDisplay.yieldRevSharePct;

  const depositUsdForEstimate =
    capDisplay.countedUsd > 0
      ? capDisplay.countedUsd
      : capDisplay.ownershipShare > 0 && capUsd
        ? capDisplay.ownershipShare * capUsd
        : userDepositUsd != null && userDepositUsd > 0
          ? userDepositUsd
          : null;

  if (depositUsdForEstimate != null && depositUsdForEstimate > 0) {
    return estimateMaidenVoyageYieldSharePct({
      depositUsd: depositUsdForEstimate,
      capUsd,
      yieldRevSharePct: revPct,
    });
  }

  return estimateMaidenVoyageYieldSharePct({
    depositUsd: MAIDEN_VOYAGE_HYPOTHETICAL_DEPOSIT_USD,
    capUsd,
    yieldRevSharePct: revPct,
  });
}

/** Props for the active-voyage revenue share calculator UI. */
export function resolveRevenueShareCalculatorProps({
  capDisplay,
  genesisAddress,
  yieldRevSharePct,
  userDepositUsd,
}: {
  capDisplay: GenesisVoyageCapDisplay;
  genesisAddress?: string;
  yieldRevSharePct?: number | null;
  userDepositUsd?: number | null;
}): {
  capUsd: number | null;
  yieldRevSharePct: number | null;
  initialDepositUsd: number;
} {
  const capUsd = resolveMaidenVoyageCapUsdForEstimate({
    genesisAddress,
    capTotalUsd: capDisplay.capTotalUsd,
  });
  const revSharePct = yieldRevSharePct ?? capDisplay.yieldRevSharePct ?? null;
  const initialDepositUsd =
    capDisplay.countedUsd > 0
      ? capDisplay.countedUsd
      : capDisplay.ownershipShare > 0 && capUsd
        ? capDisplay.ownershipShare * capUsd
        : userDepositUsd != null && userDepositUsd > 0
          ? userDepositUsd
          : MAIDEN_VOYAGE_HYPOTHETICAL_DEPOSIT_USD;

  return {
    capUsd,
    yieldRevSharePct: revSharePct,
    initialDepositUsd,
  };
}
