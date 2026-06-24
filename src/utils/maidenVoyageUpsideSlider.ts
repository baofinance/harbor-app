/** Piecewise linear deposit slider — min at 0%, pivot ($5K) at 50%, max at 100%. */

export const UPSIDE_SLIDER_THUMB_PX = 16;

const SLIDER_POSITION_STEPS = 1000;

export function upsideSliderSteps(): number {
  return SLIDER_POSITION_STEPS;
}

function linearSegmentRatio(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
): number {
  if (maxUsd <= minUsd) return 0;
  const clamped = Math.min(maxUsd, Math.max(minUsd, valueUsd));
  return (clamped - minUsd) / (maxUsd - minUsd);
}

function linearSegmentDeposit(
  ratio: number,
  minUsd: number,
  maxUsd: number,
): number {
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const raw = minUsd + clampedRatio * (maxUsd - minUsd);
  const stepped = Math.round(raw / 100) * 100;
  return Math.min(maxUsd, Math.max(minUsd, stepped));
}

function usePivotScale(
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): boolean {
  return pivotUsd > minUsd && pivotUsd < maxUsd;
}

/** 0–1 position on the track (piecewise linear with pivot at 50%). */
export function upsideDepositToTrackRatio(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): number {
  if (!usePivotScale(minUsd, maxUsd, pivotUsd)) {
    return linearSegmentRatio(valueUsd, minUsd, maxUsd);
  }

  const clamped = Math.min(maxUsd, Math.max(minUsd, valueUsd));
  if (clamped <= pivotUsd) {
    return 0.5 * linearSegmentRatio(clamped, minUsd, pivotUsd);
  }
  return 0.5 + 0.5 * linearSegmentRatio(clamped, pivotUsd, maxUsd);
}

export function upsideTrackRatioToDeposit(
  ratio: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): number {
  const clampedRatio = Math.min(1, Math.max(0, ratio));

  if (!usePivotScale(minUsd, maxUsd, pivotUsd)) {
    return linearSegmentDeposit(clampedRatio, minUsd, maxUsd);
  }

  if (clampedRatio <= 0.5) {
    return linearSegmentDeposit(clampedRatio / 0.5, minUsd, pivotUsd);
  }
  return linearSegmentDeposit((clampedRatio - 0.5) / 0.5, pivotUsd, maxUsd);
}

export function upsideDepositToSliderPosition(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): number {
  return Math.round(
    upsideDepositToTrackRatio(valueUsd, minUsd, maxUsd, pivotUsd) *
      SLIDER_POSITION_STEPS,
  );
}

export function upsideSliderPositionToDeposit(
  position: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): number {
  return upsideTrackRatioToDeposit(
    position / SLIDER_POSITION_STEPS,
    minUsd,
    maxUsd,
    pivotUsd,
  );
}

/**
 * Align ticks/labels with native range thumb center.
 * Assumes the track spans the full width of the relative parent (no extra px-* inset).
 */
export function upsideSliderMarkStyle(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): { left: string; transform: string } {
  const ratio = upsideDepositToTrackRatio(valueUsd, minUsd, maxUsd, pivotUsd);
  const half = UPSIDE_SLIDER_THUMB_PX / 2;
  let transform = "translateX(-50%)";
  if (ratio <= 0.001) transform = "translateX(0)";
  else if (ratio >= 0.999) transform = "translateX(-100%)";

  return {
    left: `calc(${half}px + ${ratio} * (100% - ${UPSIDE_SLIDER_THUMB_PX}px))`,
    transform,
  };
}

/** @deprecated Use {@link upsideSliderMarkStyle}. */
export function upsideSliderThumbStyle(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): { left: string; transform: string } {
  return upsideSliderMarkStyle(valueUsd, minUsd, maxUsd, pivotUsd);
}

export function upsideSliderFillBackground(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): string {
  const ratio = upsideDepositToTrackRatio(valueUsd, minUsd, maxUsd, pivotUsd);
  const half = UPSIDE_SLIDER_THUMB_PX / 2;
  const pct =
    ((half + ratio * (100 - UPSIDE_SLIDER_THUMB_PX)) / 100) * 100;
  const fill = "#B8EBD5";
  const track = "rgba(255, 255, 255, 0.12)";
  return `linear-gradient(to right, ${fill} 0%, ${fill} ${pct}%, ${track} ${pct}%, ${track} 100%)`;
}

/** Preset labels under the slider — consistent compact style ($500, $1K, …). */
export function formatUpsidePresetLabel(amountUsd: number): string {
  if (amountUsd >= 1_000) {
    const k = amountUsd / 1_000;
    return Number.isInteger(k) ? `$${k}K` : `$${k.toFixed(1)}K`;
  }
  return `$${amountUsd.toLocaleString("en-US")}`;
}

export function formatUpsideDepositInput(amountUsd: number): string {
  if (!Number.isFinite(amountUsd)) return "0";
  return Math.round(amountUsd).toLocaleString("en-US");
}

export function parseUpsideDepositInput(value: string, fallback: number): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function isNearUpsidePreset(depositUsd: number, presetUsd: number): boolean {
  return Math.abs(depositUsd - presetUsd) < 50;
}
