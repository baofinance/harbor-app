"use client";

import { formatUSD } from "@/utils/formatters";
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

export type GenesisUpsideHeroMetricsProps = {
  depositUsd: number;
  capUsd: number | null;
  yourSharePct: number;
  annualEarningsUsd: number;
  onDepositChange: (value: number) => void;
};

export function GenesisUpsideHeroMetrics({
  depositUsd,
  capUsd,
  yourSharePct,
  annualEarningsUsd,
  onDepositChange,
}: GenesisUpsideHeroMetricsProps) {
  const shareLabel = formatMaidenVoyageYieldSharePct(
    yourSharePct > 0 ? yourSharePct : null,
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className={`${MV_GLASS_INSET_DARK} flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center`}>
        <label htmlFor="mv-upside-deposit" className={MV_SECTION_LABEL}>
          Your deposit
        </label>
        <div className="relative mt-2 w-full max-w-[10rem]">
          <input
            id="mv-upside-deposit"
            type="number"
            min={0}
            step="100"
            value={Number.isFinite(depositUsd) ? depositUsd : 0}
            onChange={(e) =>
              onDepositChange(parseInputNumber(e.target.value, depositUsd))
            }
            className="w-full rounded-lg border border-white/10 bg-[#0a1929]/40 px-3 py-2 text-center font-mono text-sm font-semibold tabular-nums text-white/95 outline-none transition focus:border-white/25 focus:ring-1 focus:ring-white/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/45">
            USD
          </span>
        </div>
        {capUsd != null && capUsd > 0 ? (
          <p className={`mt-1.5 ${MV_CAPTION_TEXT}`}>
            Cap {formatUSD(capUsd, { compact: true, minDecimals: 0, maxDecimals: 0 })}
          </p>
        ) : null}
      </div>

      <div className={`${MV_GLASS_INSET_DARK} flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center`}>
        <p className={MV_SECTION_LABEL}>Founding share</p>
        <p className={`mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl ${MV_ACCENT_GRADIENT}`}>
          {shareLabel}
        </p>
        <p className={`mt-1 ${MV_CAPTION_TEXT}`}>of this market forever</p>
      </div>

      <div className={`${MV_GLASS_INSET_DARK} flex min-w-0 flex-col items-center justify-center px-3 py-3 text-center`}>
        <p className={MV_SECTION_LABEL}>Annual earnings</p>
        <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#B8EBD5] sm:text-3xl">
          {formatUSD(annualEarningsUsd, { compact: false })}
        </p>
        <p className={`mt-1 ${MV_CAPTION_TEXT}`}>at projected TVL</p>
      </div>
    </div>
  );
}
