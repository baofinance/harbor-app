"use client";

import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import { getActiveVoyageZeroStateCopy } from "@/utils/activeVoyageStatus";
import type { GenesisVoyageCapDisplay } from "@/utils/genesisVoyageCapDisplay";
import { formatUSD } from "@/utils/formatters";
import { GenesisActiveVoyageQuickStats } from "./GenesisActiveVoyageQuickStats";
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
  yieldRevSharePct?: number | null;
  genesisAddress?: string;
};

export function GenesisActiveVoyageMetrics({
  capDisplay,
  isLoading,
  isUnavailable,
  voyageStatus,
  yieldRevSharePct = null,
  genesisAddress,
}: GenesisActiveVoyageMetricsProps) {
  if (isLoading) {
    return (
      <div
        className="h-28 animate-pulse rounded-xl bg-black/25"
        aria-label="Loading capacity"
      />
    );
  }

  if (isUnavailable || !capDisplay) {
    return (
      <p className="text-sm text-white/60">Capacity data unavailable</p>
    );
  }

  const { filledPct, capFilled } = capDisplay;
  const progressWidth = `${Math.min(100, Math.max(0, filledPct))}%`;

  const remainingLabel = capDisplay.useTokenCap
    ? `${formatRemainingToken(capDisplay.remaining)} ${stripLabel(capDisplay.collateralSymbol)} remaining`
    : `${formatUSD(capDisplay.remainingUsd)} remaining`;

  const zeroState = getActiveVoyageZeroStateCopy(voyageStatus, filledPct);

  return (
    <div className="min-w-0">
      <GenesisActiveVoyageQuickStats
        capDisplay={capDisplay}
        yieldRevSharePct={yieldRevSharePct}
        genesisAddress={genesisAddress}
      />

      <p className={MV_SECTION_LABEL}>Capacity progress</p>
      <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight text-[#FF8A7A] sm:text-4xl">
        {filledPct.toFixed(0)}%{" "}
        <span className="text-xl uppercase sm:text-2xl">FILLED</span>
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

      <p className="mt-2 text-right font-mono text-xs font-semibold tabular-nums text-[#FF8A7A]">
        {remainingLabel.toUpperCase()}
      </p>

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
