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
} from "./maidenVoyageLayoutStyles";

/** Must match `.mv-upside-slider` thumb width in globals.css. */
const SLIDER_THUMB_PX = 16;

const SLIDER_FILL_COLOR = "#B8EBD5";
const SLIDER_TRACK_COLOR = "rgba(255, 255, 255, 0.12)";

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

function sliderRatio(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const clamped = Math.min(max, Math.max(min, value));
  return (clamped - min) / (max - min);
}

/** Align ticks/labels with native range thumb center (accounts for thumb width). */
function sliderThumbLeftStyle(
  value: number,
  min: number,
  max: number,
): { left: string; transform: string } {
  const ratio = sliderRatio(value, min, max);
  const half = SLIDER_THUMB_PX / 2;
  return {
    left: `calc(${ratio * 100}% + ${half}px - ${ratio * SLIDER_THUMB_PX}px)`,
    transform: "translateX(-50%)",
  };
}

function sliderFillBackground(value: number, min: number, max: number): string {
  const pct = sliderRatio(value, min, max) * 100;
  return `linear-gradient(to right, ${SLIDER_FILL_COLOR} 0%, ${SLIDER_FILL_COLOR} ${pct}%, ${SLIDER_TRACK_COLOR} ${pct}%, ${SLIDER_TRACK_COLOR} 100%)`;
}

function isNearPreset(depositUsd: number, preset: number): boolean {
  return Math.abs(depositUsd - preset) < 50;
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
  const sliderMax = Math.min(
    maxDeposit,
    Math.max(sliderMaxPreset, depositUsd > 0 ? depositUsd : sliderMin),
  );

  const sliderValue = useMemo(
    () => Math.min(sliderMax, Math.max(sliderMin, depositUsd)),
    [depositUsd, sliderMin, sliderMax],
  );

  const visiblePresets = useMemo(
    () =>
      MAIDEN_VOYAGE_UPSIDE_COPY.depositPresets.filter(
        (preset) => preset >= sliderMin && preset <= sliderMax,
      ),
    [sliderMin, sliderMax],
  );

  const sliderBackground = useMemo(
    () => sliderFillBackground(sliderValue, sliderMin, sliderMax),
    [sliderValue, sliderMin, sliderMax],
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
        <div className="flex flex-col gap-4">
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

          <div className="min-w-0 px-2 sm:px-2.5">
            <div className="relative">
              {visiblePresets.map((preset) => (
                <span
                  key={`tick-${preset}`}
                  className="pointer-events-none absolute top-1/2 z-0 h-2 w-px -translate-y-1/2 bg-white/25"
                  style={sliderThumbLeftStyle(preset, sliderMin, sliderMax)}
                  aria-hidden
                />
              ))}
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={100}
                value={sliderValue}
                onChange={(e) => onDepositChange(Number(e.target.value))}
                className="mv-upside-slider relative z-10"
                style={{ background: sliderBackground }}
                aria-label="Adjust deposit amount"
                aria-valuemin={sliderMin}
                aria-valuemax={sliderMax}
                aria-valuenow={sliderValue}
              />
            </div>

            <div className="relative mt-3 h-5">
              {visiblePresets.map((preset) => {
                const isActive = isNearPreset(depositUsd, preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onDepositChange(preset)}
                    className={`absolute top-0 whitespace-nowrap text-[10px] font-medium tabular-nums transition-colors sm:text-[11px] ${
                      isActive
                        ? "text-[#B8EBD5]"
                        : "text-white/40 hover:text-white/70"
                    }`}
                    style={sliderThumbLeftStyle(preset, sliderMin, sliderMax)}
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
