"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import {
  formatMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import { GenesisUpsideAnimatedNumber } from "./GenesisUpsideAnimatedMetrics";
import {
  MV_CAPTION_TEXT,
  MV_SECTION_LABEL,
  MV_UPSIDE_DEPOSIT_INPUT_FOCUS,
  MV_UPSIDE_DEPOSIT_PANEL,
  MV_UPSIDE_OWNERSHIP_FLASH,
  MV_UPSIDE_OWNERSHIP_GLOW,
  MV_UPSIDE_OWNERSHIP_ICON,
  MV_UPSIDE_OWNERSHIP_PANEL,
  MV_UPSIDE_OWNERSHIP_TEXT,
  MV_UPSIDE_SLIDER,
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
  if (amount >= 1_000) return `$${amount / 1_000}k`;
  return `$${amount}`;
}

function formatDepositInputValue(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  return String(Math.round(amount));
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

  const sliderMin = MAIDEN_VOYAGE_UPSIDE_COPY.sliderMinUsd;
  const sliderMaxPreset = MAIDEN_VOYAGE_UPSIDE_COPY.sliderMaxUsd;
  const maxDeposit = capUsd ?? 10_000_000;
  const sliderMax = Math.min(sliderMaxPreset, maxDeposit);

  const sliderValue = useMemo(
    () => Math.min(sliderMax, Math.max(sliderMin, depositUsd)),
    [depositUsd, sliderMin, sliderMax],
  );

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

  return (
    <div className="flex flex-col gap-2.5">
      <div className={MV_UPSIDE_DEPOSIT_PANEL}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div className="min-w-0">
            <label htmlFor="mv-upside-deposit" className={MV_SECTION_LABEL}>
              {MAIDEN_VOYAGE_UPSIDE_COPY.depositLabel}
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-lg font-medium text-white/50">$</span>
              <input
                id="mv-upside-deposit"
                type="number"
                min={0}
                step="100"
                value={formatDepositInputValue(depositUsd)}
                onChange={(e) =>
                  onDepositChange(parseInputNumber(e.target.value, depositUsd))
                }
                className={`min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-2xl font-semibold tabular-nums text-white outline-none sm:text-[1.65rem] ${MV_UPSIDE_DEPOSIT_INPUT_FOCUS}`}
              />
              <span className="shrink-0 rounded-lg border border-white/12 bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-white/55">
                USD
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={100}
              value={sliderValue}
              onChange={(e) => onDepositChange(Number(e.target.value))}
              className={MV_UPSIDE_SLIDER}
              aria-label="Adjust deposit amount"
              aria-valuemin={sliderMin}
              aria-valuemax={sliderMax}
              aria-valuenow={sliderValue}
            />
            <div className="mt-2 flex justify-between gap-1">
              {MAIDEN_VOYAGE_UPSIDE_COPY.depositPresets.map((preset) => {
                if (preset > sliderMax) return null;
                const isActive = depositUsd === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onDepositChange(preset)}
                    className={`text-[10px] font-medium tabular-nums transition-colors sm:text-[11px] ${
                      isActive ? "text-white" : "text-white/40 hover:text-white/65"
                    }`}
                  >
                    {formatPresetLabel(preset)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${MV_UPSIDE_OWNERSHIP_PANEL} ${MV_UPSIDE_OWNERSHIP_GLOW} px-3 py-3 transition-shadow duration-300 sm:px-4 sm:py-3.5 ${
          ownershipFlash ? MV_UPSIDE_OWNERSHIP_FLASH : ""
        }`}
      >
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:flex-1">
            <div className={MV_UPSIDE_OWNERSHIP_ICON}>
              <SparklesIcon className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-medium text-[#FF8A7A]/90">
              {MAIDEN_VOYAGE_UPSIDE_COPY.revenueShareTitle}
            </p>
          </div>

          {revenueSharePct != null && revenueSharePct > 0 ? (
            <p
              className={`shrink-0 font-mono text-3xl font-bold tabular-nums sm:text-[2rem] ${MV_UPSIDE_OWNERSHIP_TEXT}`}
            >
              <GenesisUpsideAnimatedNumber
                value={revenueSharePct}
                format={formatYieldShare}
              />
            </p>
          ) : (
            <p
              className={`shrink-0 font-mono text-3xl font-bold tabular-nums sm:text-[2rem] ${MV_UPSIDE_OWNERSHIP_TEXT}`}
            >
              {formatMaidenVoyageYieldSharePct(revenueSharePct)}
            </p>
          )}

          <div
            className="hidden h-9 w-px shrink-0 bg-white/15 sm:block"
            aria-hidden
          />

          <p className={`min-w-0 flex-1 ${MV_CAPTION_TEXT} sm:text-sm`}>
            {MAIDEN_VOYAGE_UPSIDE_COPY.revenueShareCaption}
          </p>
        </div>
      </div>
    </div>
  );
}
