"use client";

import {
  formatMaidenVoyageOwnershipPct,
  formatMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
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

export type GenesisFoundingPositionCardsProps = {
  depositUsd: number;
  ownershipPct: number | null;
  revenueSharePct: number | null;
  onDepositChange: (value: number) => void;
};

export function GenesisFoundingPositionCards({
  depositUsd,
  ownershipPct,
  revenueSharePct,
  onDepositChange,
}: GenesisFoundingPositionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div
        className={`${MV_GLASS_INSET_DARK} flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center`}
      >
        <label htmlFor="mv-founding-deposit" className={MV_SECTION_LABEL}>
          Your deposit
        </label>
        <div className="relative mt-2 w-full max-w-[10rem]">
          <input
            id="mv-founding-deposit"
            type="number"
            min={0}
            step="100"
            value={Number.isFinite(depositUsd) ? depositUsd : 0}
            onChange={(e) =>
              onDepositChange(parseInputNumber(e.target.value, depositUsd))
            }
            className="w-full rounded-lg border border-white/10 bg-[#0a1929]/40 py-2 pl-3 pr-10 text-center font-mono text-sm font-semibold tabular-nums text-white/95 outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/45">
            USD
          </span>
        </div>
      </div>

      <div
        className={`${MV_GLASS_INSET_DARK} flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center`}
      >
        <p className={MV_SECTION_LABEL}>Voyage ownership</p>
        <p
          className={`mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl ${MV_ACCENT_GRADIENT}`}
        >
          {formatMaidenVoyageOwnershipPct(ownershipPct)}
        </p>
        <p className={`mt-1 ${MV_CAPTION_TEXT}`}>of voyage capacity</p>
      </div>

      <div
        className={`${MV_GLASS_INSET_DARK} flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center`}
      >
        <p className={MV_SECTION_LABEL}>Revenue share eligibility</p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#B8EBD5] sm:text-3xl">
          {formatMaidenVoyageYieldSharePct(revenueSharePct)}
        </p>
        <p className={`mt-1 ${MV_CAPTION_TEXT}`}>of future market revenue</p>
      </div>
    </div>
  );
}
