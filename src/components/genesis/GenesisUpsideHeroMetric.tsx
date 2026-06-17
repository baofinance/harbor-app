"use client";

import { formatMaidenVoyageYieldSharePct } from "@/utils/maidenVoyageYieldShareEstimate";
import {
  MV_ACCENT_GRADIENT,
  MV_CAPTION_TEXT,
  MV_GLASS_INSET_DARK,
  MV_SECTION_LABEL,
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
      className={`${MV_GLASS_INSET_DARK} relative overflow-hidden rounded-3xl px-4 py-6 text-center sm:px-6 sm:py-8`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FF8A7A]/[0.07] via-transparent to-[#B8EBD5]/[0.05]"
        aria-hidden
      />
      <div className="relative">
        <p
          className={`font-mono text-5xl font-bold tabular-nums sm:text-6xl ${MV_ACCENT_GRADIENT}`}
        >
          {formatMaidenVoyageYieldSharePct(revenueSharePct)}
        </p>
        <p className="mt-2 text-sm font-semibold text-white/90 sm:text-base">
          Your Future Revenue Share
        </p>
        <p className={`mt-1 ${MV_CAPTION_TEXT}`}>
          Based on your current founding position
        </p>

        <div className="mx-auto mt-4 flex max-w-[12rem] flex-col items-center gap-1.5">
          <label htmlFor="mv-upside-deposit" className={MV_SECTION_LABEL}>
            Deposit amount
          </label>
          <div className="relative w-full">
            <input
              id="mv-upside-deposit"
              type="number"
              min={0}
              step="100"
              value={Number.isFinite(depositUsd) ? depositUsd : 0}
              onChange={(e) =>
                onDepositChange(parseInputNumber(e.target.value, depositUsd))
              }
              className="w-full rounded-xl border border-white/10 bg-[#0a1929]/40 py-2 pl-3 pr-10 text-center font-mono text-sm font-semibold tabular-nums text-white/95 outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/45">
              USD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
