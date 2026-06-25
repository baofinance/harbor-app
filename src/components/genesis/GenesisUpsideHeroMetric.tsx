"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import {
  formatMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import {
  formatUpsideDepositInput,
  formatUpsidePresetLabel,
  isNearUpsidePreset,
  parseUpsideDepositInput,
  upsideDepositToSliderPosition,
  upsideSliderFillBackground,
  upsideSliderMarkStyle,
  upsideSliderPositionToDeposit,
  upsideSliderSteps,
} from "@/utils/maidenVoyageUpsideSlider";
import { GenesisUpsideAnimatedNumber } from "./GenesisUpsideAnimatedMetrics";
import {
  MV_SECTION_LABEL,
  MV_UPSIDE_DEPOSIT_INPUT_FOCUS,
  MV_UPSIDE_DEPOSIT_PANEL,
  MV_UPSIDE_OWNERSHIP_FLASH,
  MV_UPSIDE_OWNERSHIP_TEXT,
} from "./maidenVoyageLayoutStyles";

function formatYieldShareForAnimation(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return "—";
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  if (pct >= 0.001) return `${pct.toFixed(3)}%`;
  return `${pct.toFixed(4)}%`;
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
  const sliderPivot = MAIDEN_VOYAGE_UPSIDE_COPY.sliderPivotUsd;
  const sliderMaxPreset = MAIDEN_VOYAGE_UPSIDE_COPY.sliderMaxUsd;
  const maxDeposit = capUsd ?? 10_000_000;
  const sliderMax = Math.min(
    maxDeposit,
    Math.max(sliderMaxPreset, depositUsd > 0 ? depositUsd : sliderMin),
  );

  const sliderSteps = upsideSliderSteps();

  const sliderPosition = useMemo(
    () =>
      upsideDepositToSliderPosition(
        depositUsd,
        sliderMin,
        sliderMax,
        sliderPivot,
      ),
    [depositUsd, sliderMin, sliderMax, sliderPivot],
  );

  const visiblePresets = useMemo(
    () =>
      MAIDEN_VOYAGE_UPSIDE_COPY.depositPresets.filter(
        (preset) => preset >= sliderMin && preset <= sliderMax,
      ),
    [sliderMin, sliderMax],
  );

  const sliderBackground = useMemo(
    () =>
      upsideSliderFillBackground(depositUsd, sliderMin, sliderMax, sliderPivot),
    [depositUsd, sliderMin, sliderMax, sliderPivot],
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

  const revenueShareDisplay =
    revenueSharePct != null && revenueSharePct > 0 ? (
      <GenesisUpsideAnimatedNumber
        value={revenueSharePct}
        format={formatYieldShare}
      />
    ) : (
      formatMaidenVoyageYieldSharePct(revenueSharePct)
    );

  return (
    <div
      className={`${MV_UPSIDE_DEPOSIT_PANEL} transition-shadow duration-300 ${
        ownershipFlash ? MV_UPSIDE_OWNERSHIP_FLASH : ""
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 sm:gap-x-5 lg:gap-x-6">
        <div className="col-start-1 row-start-1 self-end shrink-0">
          <label htmlFor="mv-upside-deposit" className={MV_SECTION_LABEL}>
            {MAIDEN_VOYAGE_UPSIDE_COPY.depositLabel}
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-lg font-medium text-white/50">$</span>
            <input
              id="mv-upside-deposit"
              type="text"
              inputMode="numeric"
              value={formatUpsideDepositInput(depositUsd)}
              onChange={(e) =>
                onDepositChange(
                  parseUpsideDepositInput(e.target.value, depositUsd),
                )
              }
              className={`w-[6.25rem] min-w-0 border-0 bg-transparent p-0 font-mono text-2xl font-semibold tabular-nums text-white outline-none sm:w-[7rem] sm:text-[1.65rem] ${MV_UPSIDE_DEPOSIT_INPUT_FOCUS}`}
            />
            <span className="shrink-0 rounded-lg border border-white/12 bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-white/55">
              USD
            </span>
          </div>
        </div>

        <div className="col-start-2 row-start-1 min-w-0 self-end pb-0.5">
          <div className="relative">
            {visiblePresets.map((preset) => {
              const markStyle = upsideSliderMarkStyle(
                preset,
                sliderMin,
                sliderMax,
                sliderPivot,
              );
              return (
                <span
                  key={`tick-${preset}`}
                  className="pointer-events-none absolute top-1/2 z-0 h-2 w-px bg-white/25"
                  style={{
                    left: markStyle.left,
                    transform: `${markStyle.transform} translateY(-50%)`,
                  }}
                  aria-hidden
                />
              );
            })}
            <input
              type="range"
              min={0}
              max={sliderSteps}
              step={1}
              value={sliderPosition}
              onChange={(e) =>
                onDepositChange(
                  upsideSliderPositionToDeposit(
                    Number(e.target.value),
                    sliderMin,
                    sliderMax,
                    sliderPivot,
                  ),
                )
              }
              className="mv-upside-slider relative z-10 block w-full"
              style={{ background: sliderBackground }}
              aria-label="Adjust deposit amount"
              aria-valuemin={sliderMin}
              aria-valuemax={sliderMax}
              aria-valuenow={depositUsd}
            />
          </div>
        </div>

        <div
          className="col-start-3 row-start-1 shrink-0 self-end border-l border-white/10 pl-3 text-right sm:pl-4"
          title={MAIDEN_VOYAGE_UPSIDE_COPY.revenueShareCaption}
        >
          <p className={`${MV_SECTION_LABEL} whitespace-nowrap`}>
            {MAIDEN_VOYAGE_UPSIDE_COPY.revenueShareTitle}
          </p>
          <p
            className={`mt-1.5 font-mono text-xl font-bold tabular-nums sm:text-2xl ${MV_UPSIDE_OWNERSHIP_TEXT}`}
            aria-label={`${MAIDEN_VOYAGE_UPSIDE_COPY.revenueShareCaption}: ${formatMaidenVoyageYieldSharePct(revenueSharePct)}`}
          >
            {revenueShareDisplay}
          </p>
        </div>

        <div className="col-start-2 row-start-2 mt-2.5 min-w-0">
          <div className="relative h-5">
            {visiblePresets.map((preset) => {
              const isActive = isNearUpsidePreset(depositUsd, preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onDepositChange(preset)}
                  className={`absolute top-0 min-w-[2.25rem] whitespace-nowrap font-mono text-[10px] font-medium tabular-nums transition-colors sm:min-w-[2.5rem] sm:text-[11px] ${
                    isActive
                      ? "text-[#B8EBD5]"
                      : "text-white/40 hover:text-white/70"
                  }`}
                  style={upsideSliderMarkStyle(
                    preset,
                    sliderMin,
                    sliderMax,
                    sliderPivot,
                  )}
                >
                  {formatUpsidePresetLabel(preset)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
