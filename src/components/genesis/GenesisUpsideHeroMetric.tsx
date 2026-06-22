"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import {
  formatMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import { GenesisUpsideAnimatedNumber } from "./GenesisUpsideAnimatedMetrics";
import {
  MV_CAPTION_TEXT,
  MV_SECTION_LABEL,
  MV_STAT_TILE,
  MV_UPSIDE_DEPOSIT_CHIP,
  MV_UPSIDE_DEPOSIT_CHIP_ACTIVE,
  MV_UPSIDE_DEPOSIT_INPUT_FOCUS,
  MV_UPSIDE_OWNERSHIP_FLASH,
  MV_UPSIDE_OWNERSHIP_GLOW,
  MV_UPSIDE_OWNERSHIP_PANEL,
  MV_UPSIDE_OWNERSHIP_TEXT,
} from "./maidenVoyageLayoutStyles";

function parseInputNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatYieldShareForAnimation(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return "—";
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  if (pct >= 0.001) return `${pct.toFixed(3)}%`;
  return `${pct.toFixed(4)}%`;
}

function formatPresetLabel(amount: number): string {
  if (amount >= 1_000) {
    return `$${amount / 1_000}k`;
  }
  return `$${amount}`;
}

export type GenesisUpsideHeroMetricProps = {
  revenueSharePct: number | null;
  depositUsd: number;
  capUsd: number | null;
  onDepositChange: (value: number) => void;
};

export function GenesisUpsideHeroMetric({
  revenueSharePct,
  depositUsd,
  capUsd,
  onDepositChange,
}: GenesisUpsideHeroMetricProps) {
  const [ownershipFlash, setOwnershipFlash] = useState(false);
  const prevRevenueShareRef = useRef(revenueSharePct);

  useEffect(() => {
    if (
      prevRevenueShareRef.current === revenueSharePct ||
      revenueSharePct == null
    ) {
      prevRevenueShareRef.current = revenueSharePct;
      return;
    }

    prevRevenueShareRef.current = revenueSharePct;
    setOwnershipFlash(true);
    const timeoutId = window.setTimeout(() => setOwnershipFlash(false), 450);
    return () => window.clearTimeout(timeoutId);
  }, [revenueSharePct]);

  const formatYieldShare = useCallback(formatYieldShareForAnimation, []);

  const maxDeposit = capUsd ?? 10_000_000;

  return (
    <div className="flex flex-col gap-2.5">
      <div className={`${MV_STAT_TILE} px-3 py-2.5`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <label htmlFor="mv-upside-deposit" className={MV_SECTION_LABEL}>
            {MAIDEN_VOYAGE_UPSIDE_COPY.depositLabel}
          </label>
          <div className="relative w-full sm:w-[8.5rem] sm:shrink-0">
            <input
              id="mv-upside-deposit"
              type="number"
              min={0}
              step="100"
              value={Number.isFinite(depositUsd) ? depositUsd : 0}
              onChange={(e) =>
                onDepositChange(parseInputNumber(e.target.value, depositUsd))
              }
              className={`w-full rounded-xl border border-white/10 bg-[#0a1929]/40 py-1.5 pl-3 pr-10 text-center font-mono text-xs font-semibold tabular-nums text-white/95 outline-none transition focus:ring-1 ${MV_UPSIDE_DEPOSIT_INPUT_FOCUS}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/45">
              USD
            </span>
          </div>
        </div>

        <div className="mt-2.5">
          <p className={`mb-1.5 ${MV_SECTION_LABEL}`}>
            {MAIDEN_VOYAGE_UPSIDE_COPY.tryDepositLabel}
          </p>
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MAIDEN_VOYAGE_UPSIDE_COPY.depositPresets.map((preset) => {
              const isActive = depositUsd === preset;
              const isDisabled = preset > maxDeposit;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onDepositChange(preset)}
                  className={`${MV_UPSIDE_DEPOSIT_CHIP} ${
                    isActive ? MV_UPSIDE_DEPOSIT_CHIP_ACTIVE : ""
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                  aria-pressed={isActive}
                >
                  {formatPresetLabel(preset)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-center" aria-hidden>
        <ChevronDownIcon className="h-4 w-4 text-white/30" />
      </div>

      <div
        className={`${MV_UPSIDE_OWNERSHIP_PANEL} ${MV_UPSIDE_OWNERSHIP_GLOW} px-3 py-4 text-center transition-shadow duration-300 sm:py-5 ${
          ownershipFlash ? MV_UPSIDE_OWNERSHIP_FLASH : ""
        }`}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF8A7A]/[0.05] blur-2xl"
          aria-hidden
        />
        <div className="relative">
          {revenueSharePct != null && revenueSharePct > 0 ? (
            <p
              className={`font-mono text-3xl font-bold tabular-nums sm:text-4xl ${MV_UPSIDE_OWNERSHIP_TEXT}`}
            >
              <GenesisUpsideAnimatedNumber
                value={revenueSharePct}
                format={formatYieldShare}
              />
            </p>
          ) : (
            <p
              className={`font-mono text-3xl font-bold tabular-nums sm:text-4xl ${MV_UPSIDE_OWNERSHIP_TEXT}`}
            >
              {formatMaidenVoyageYieldSharePct(revenueSharePct)}
            </p>
          )}
          <p className="mt-1 text-sm font-semibold text-white/90">
            {MAIDEN_VOYAGE_UPSIDE_COPY.revenueShareTitle}
          </p>
          <p className={`mt-1 ${MV_CAPTION_TEXT}`}>
            {MAIDEN_VOYAGE_UPSIDE_COPY.revenueShareCaption}
          </p>
        </div>
      </div>
    </div>
  );
}
