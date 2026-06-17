"use client";

import { formatUSD } from "@/utils/formatters";
import {
  REVENUE_SHARE_CALC_SLIDER_BOUNDS,
  REVENUE_SHARE_CALC_TRADING_FEE_PCT,
  type RevenueShareCalcResult,
  type RevenueShareMarketAssumptions,
} from "@/utils/maidenVoyageRevenueShareCalculator";
import {
  MV_CAPTION_TEXT,
  MV_DETAILS_PANEL,
  MV_META_TEXT,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

function CalcSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={MV_SECTION_LABEL}>
          {label}
        </label>
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-white/90">
          {formatValue(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#B8EBD5] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#B8EBD5] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#B8EBD5]"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className={`mt-1 flex justify-between ${MV_META_TEXT}`}>
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

export type GenesisUpsideAdvancedAssumptionsProps = {
  projectedTvlUsd: number;
  revenueRatePct: number;
  depositUsd: number;
  assumptions: RevenueShareMarketAssumptions;
  selectedResult: RevenueShareCalcResult;
  onProjectedTvlChange: (value: number) => void;
  onAssumptionChange: <K extends keyof RevenueShareMarketAssumptions>(
    key: K,
    value: RevenueShareMarketAssumptions[K],
  ) => void;
};

export function GenesisUpsideAdvancedAssumptions({
  projectedTvlUsd,
  revenueRatePct,
  depositUsd,
  assumptions,
  selectedResult,
  onProjectedTvlChange,
  onAssumptionChange,
}: GenesisUpsideAdvancedAssumptionsProps) {
  const tvlBounds = REVENUE_SHARE_CALC_SLIDER_BOUNDS.tvlUsd;
  const yieldBounds = REVENUE_SHARE_CALC_SLIDER_BOUNDS.collateralYieldPct;
  const volumeBounds = REVENUE_SHARE_CALC_SLIDER_BOUNDS.tradingVolumeUsd;

  return (
    <details className={`${MV_DETAILS_PANEL} group`}>
      <summary className="cursor-pointer list-none px-3 py-2.5 sm:px-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className={MV_SECTION_LABEL}>
              Projected TVL{" "}
              <span className="font-mono text-sm font-semibold text-white/90">
                {formatUSD(projectedTvlUsd, {
                  compact: true,
                  minDecimals: 0,
                  maxDecimals: 1,
                })}
              </span>
            </span>
            <span className={MV_SECTION_LABEL}>
              Revenue rate{" "}
              <span className="font-mono text-sm font-semibold text-white/90">
                {revenueRatePct.toFixed(1)}%
              </span>
            </span>
            <span className={MV_SECTION_LABEL}>
              Your deposit{" "}
              <span className="font-mono text-sm font-semibold text-white/90">
                {formatUSD(depositUsd, { compact: false })}
              </span>
            </span>
          </div>
          <span
            className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/45 transition group-open:text-white/65"
            aria-hidden
          >
            <span className="group-open:hidden">Adjust assumptions</span>
            <span className="hidden group-open:inline">Hide assumptions</span>
          </span>
        </div>
      </summary>

      <div className="border-t border-white/10 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CalcSlider
            id="mv-upside-tvl"
            label="Projected TVL"
            value={projectedTvlUsd}
            min={tvlBounds.min}
            max={tvlBounds.max}
            step={tvlBounds.step}
            formatValue={(v) =>
              formatUSD(v, { compact: true, minDecimals: 0, maxDecimals: 1 })
            }
            onChange={onProjectedTvlChange}
          />
          <CalcSlider
            id="mv-upside-collateral-yield"
            label="Collateral yield"
            value={assumptions.collateralYieldPct}
            min={yieldBounds.min}
            max={yieldBounds.max}
            step={yieldBounds.step}
            formatValue={(v) => `${v.toFixed(1)}% / yr`}
            onChange={(v) => onAssumptionChange("collateralYieldPct", v)}
          />
          <CalcSlider
            id="mv-upside-trading-volume"
            label="Trading volume"
            value={assumptions.tradingVolumeUsd}
            min={volumeBounds.min}
            max={volumeBounds.max}
            step={volumeBounds.step}
            formatValue={(v) =>
              formatUSD(v, { compact: true, minDecimals: 0, maxDecimals: 1 }) +
              " / yr"
            }
            onChange={(v) => onAssumptionChange("tradingVolumeUsd", v)}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#0a1929]/35 px-3 py-2">
            <p className={MV_SECTION_LABEL}>Collateral yield revenue</p>
            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90">
              {formatUSD(selectedResult.collateralYieldPerYear, { compact: false })} / yr
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0a1929]/35 px-3 py-2">
            <p className={MV_SECTION_LABEL}>Trading fee revenue</p>
            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white/90">
              {formatUSD(selectedResult.tradingFeesPerYear, { compact: false })} / yr
            </p>
          </div>
        </div>

        <p className={`mt-3 ${MV_CAPTION_TEXT}`}>
          Average trading fee: {REVENUE_SHARE_CALC_TRADING_FEE_PCT}%. Illustrative
          only — actual revenue depends on market TVL, volume, and fee settings.
        </p>
      </div>
    </details>
  );
}
