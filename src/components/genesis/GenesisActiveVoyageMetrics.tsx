"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import {
  getActiveVoyageZeroStateCopy,
} from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { formatUSD } from "@/utils/formatters";
import {
  MV_PROGRESS_FILL,
  MV_PROGRESS_FILL_COMPLETE,
  MV_PROGRESS_TRACK,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

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
        className="h-28 animate-pulse rounded-xl bg-white/10"
        aria-label="Loading capacity"
      />
    );
  }

  if (isUnavailable || !capDisplay) {
    return (
      <p className="text-sm text-white/50">Capacity data unavailable</p>
    );
  }

  const { filledPct, capFilled } = capDisplay;
  const progressWidth = `${Math.min(100, Math.max(0, filledPct))}%`;

  const currentLabel = capDisplay.useTokenCap
    ? `${capDisplay.capCurrent.toFixed(2)} / ${capDisplay.capTotal.toFixed(0)} ${stripLabel(capDisplay.collateralSymbol)}`
    : `${formatUSD(capDisplay.capCurrentUsd)} / ${formatUSD(capDisplay.capTotalUsd)}`;

  const remainingLabel = capDisplay.useTokenCap
    ? `${formatRemainingToken(capDisplay.remaining)} ${stripLabel(capDisplay.collateralSymbol)} remaining`
    : `${formatUSD(capDisplay.remainingUsd)} remaining`;

  const zeroState = getActiveVoyageZeroStateCopy(voyageStatus, filledPct);

  return (
    <div className="min-w-0">
      <p className={MV_SECTION_LABEL}>Capacity progress</p>
      <p className="mt-1 font-mono text-4xl font-bold tabular-nums tracking-tight text-[#FF8A7A] sm:text-5xl">
        {filledPct.toFixed(0)}%{" "}
        <span className="text-2xl uppercase sm:text-3xl">FILLED</span>
      </p>

      <div
        className={`mt-3 ${MV_PROGRESS_TRACK}`}
        role="progressbar"
        aria-valuenow={Math.round(filledPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Deposit cap progress"
      >
        <div
          className={capFilled ? MV_PROGRESS_FILL_COMPLETE : MV_PROGRESS_FILL}
          style={{ width: progressWidth }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
        <span className="font-mono tabular-nums text-white/55">{currentLabel}</span>
        <span className="font-mono font-semibold tabular-nums text-[#FF8A7A]/90">
          {remainingLabel.toUpperCase()}
        </span>
      </div>

      {zeroState ? (
        <p className="mt-2 text-xs leading-snug text-[#4A9784]/90">
          {zeroState.line1}
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
