"use client";

import { formatMaidenVoyageYieldSharePct } from "@/utils/maidenVoyageYieldShareEstimate";
import {
  MV_ACCENT_GRADIENT,
  MV_SECTION_LABEL,
  MV_STAT_TILE,
} from "./maidenVoyageLayoutStyles";

function parseInputNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export type GenesisUpsideHeroMetricProps = {
  revenueSharePct: number | null;
  depositUsd: number;
  onDepositChange: (value: number) => void;
};

export function GenesisUpsideHeroMetric({
  revenueSharePct,
  depositUsd,
  onDepositChange,
}: GenesisUpsideHeroMetricProps) {
  return (
    <div
      className={`${MV_STAT_TILE} flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-3.5`}
    >
      <div className="min-w-0 text-center sm:text-left">
        <p
          className={`font-mono text-2xl font-bold tabular-nums sm:text-3xl ${MV_ACCENT_GRADIENT}`}
        >
          {formatMaidenVoyageYieldSharePct(revenueSharePct)}
        </p>
        <p className="mt-0.5 text-xs text-white/70">
          Your future revenue share
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 sm:items-end">
        <label htmlFor="mv-upside-deposit" className={MV_SECTION_LABEL}>
          Deposit amount
        </label>
        <div className="relative w-[7.5rem] sm:w-[8.5rem]">
          <input
            id="mv-upside-deposit"
            type="number"
            min={0}
            step="100"
            value={Number.isFinite(depositUsd) ? depositUsd : 0}
            onChange={(e) =>
              onDepositChange(parseInputNumber(e.target.value, depositUsd))
            }
            className="w-full rounded-xl border border-white/10 bg-[#0a1929]/40 py-1.5 pl-3 pr-10 text-center font-mono text-xs font-semibold tabular-nums text-white/95 outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/45">
            USD
          </span>
        </div>
      </div>
    </div>
  );
}
