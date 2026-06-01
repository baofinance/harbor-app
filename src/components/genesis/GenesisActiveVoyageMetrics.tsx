"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import {
  getActiveVoyageZeroStateCopy,
  getCapDataSourceLabel,
} from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { formatUSD } from "@/utils/formatters";
import { GenesisVoyageProgressMilestones } from "./GenesisVoyageProgressMilestones";

function stripLabel(symbol: string): string {
  const s = symbol.trim();
  const lower = s.toLowerCase();
  if (lower === "wsteth") return "wstETH";
  if (lower === "steth") return "stETH";
  if (lower === "hausd") return "haUSD";
  if (lower.startsWith("hs")) return `hs${s.slice(2)}`;
  if (lower.startsWith("ha")) return `ha${s.slice(2)}`;
  return s;
}

export type GenesisActiveVoyageMetricsProps = {
  capDisplay: GenesisVoyageCapDisplay | null;
  isLoading: boolean;
  isUnavailable: boolean;
  voyageStatus: ActiveVoyageStatus;
};

export function GenesisActiveVoyageMetrics({
  capDisplay,
  isLoading,
  isUnavailable,
  voyageStatus,
}: GenesisActiveVoyageMetricsProps) {
  if (isLoading) {
    return (
      <div
        className="h-28 animate-pulse rounded-xl bg-[#1E4775]/8"
        aria-label="Loading capacity"
      />
    );
  }

  if (isUnavailable || !capDisplay) {
    return (
      <p className="text-sm text-[#1E4775]/60">Capacity data unavailable</p>
    );
  }

  const { filledPct, capFilled } = capDisplay;
  const progressWidth = `${Math.min(100, Math.max(0, filledPct))}%`;

  const remainingPrimary = capDisplay.useTokenCap
    ? `${formatRemainingToken(capDisplay.remaining)} ${stripLabel(capDisplay.collateralSymbol)}`
    : formatUSD(capDisplay.remainingUsd);

  const depositedSecondary = capDisplay.useTokenCap
    ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)} ${stripLabel(capDisplay.collateralSymbol)} deposited`
    : `${formatUSD(capDisplay.capCurrentUsd)} / ${formatUSD(capDisplay.capTotalUsd)} deposited`;

  const zeroState = getActiveVoyageZeroStateCopy(voyageStatus, filledPct);
  const sourceLabel = getCapDataSourceLabel(capDisplay, isLoading, isUnavailable);

  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1E4775]/55">
        Remaining capacity
      </p>
      <p className="mt-0.5 font-mono text-4xl font-bold tabular-nums tracking-tight text-[#1E4775] sm:text-5xl">
        {remainingPrimary}
        <span className="ml-2 text-lg font-semibold text-[#1E4775]/50 sm:text-xl">
          remaining
        </span>
      </p>

      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#1E4775]/85">
        {filledPct.toFixed(0)}% filled
      </p>

      <p className="mt-1 text-xs text-[#1E4775]/60">{depositedSecondary}</p>

      {zeroState ? (
        <div className="mt-2 space-y-0.5 text-xs leading-snug">
          <p className="text-[#4A9784]/90">
            {zeroState.line1}{" "}
            <span className="text-[#1E4775]/55">{zeroState.line2}</span>
          </p>
          <p className="text-[#1E4775]/55">{zeroState.line3}</p>
        </div>
      ) : null}

      <div
        className="mt-3 h-3 overflow-hidden rounded-full border border-[#B8EBD5]/50 bg-[#1E4775]/10"
        role="progressbar"
        aria-valuenow={Math.round(filledPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Deposit cap progress"
      >
        <div
          className={`h-full rounded-full transition-[width] ${
            capFilled ? "bg-[#9AA5B8]" : "bg-[#4A9784]"
          }`}
          style={{ width: progressWidth }}
        />
      </div>

      <GenesisVoyageProgressMilestones
        filledPct={filledPct}
        capFilled={capFilled}
      />

      {sourceLabel ? (
        <p className="mt-2 text-center text-[11px] text-[#1E4775]/45 sm:text-left">
          {sourceLabel}
        </p>
      ) : null}
    </div>
  );
}

function formatRemainingToken(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1000) return amount.toFixed(0);
  if (amount >= 1) return amount.toFixed(2);
  return amount.toFixed(4);
}
