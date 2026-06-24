/** Piecewise log-scale deposit slider — $500 at min, pivot ($5K) at center, max at end. */

export const UPSIDE_SLIDER_THUMB_PX = 16;

const SLIDER_POSITION_STEPS = 1000;

export function upsideSliderSteps(): number {
  return SLIDER_POSITION_STEPS;
}

function logBounds(minUsd: number, maxUsd: number): { logMin: number; logSpan: number } {
  const safeMin = Math.max(minUsd, 1);
  const safeMax = Math.max(maxUsd, safeMin + 1);
  const logMin = Math.log(safeMin);
  return { logMin, logSpan: Math.log(safeMax) - logMin };
}

function logSegmentRatio(valueUsd: number, minUsd: number, maxUsd: number): number {
  const { logMin, logSpan } = logBounds(minUsd, maxUsd);
  if (logSpan <= 0) return 0;
  const clamped = Math.min(maxUsd, Math.max(minUsd, valueUsd));
  return (Math.log(Math.max(clamped, 1)) - logMin) / logSpan;
}

function logSegmentDeposit(ratio: number, minUsd: number, maxUsd: number): number {
  const { logMin, logSpan } = logBounds(minUsd, maxUsd);
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const raw = Math.exp(logMin + clampedRatio * logSpan);
  const stepped = Math.round(raw / 100) * 100;
  return Math.min(maxUsd, Math.max(minUsd, stepped));
}

function usePivotScale(minUsd: number, maxUsd: number, pivotUsd: number): boolean {
  return pivotUsd > minUsd && pivotUsd < maxUsd;
}

/** 0–1 position on the track (piecewise log with pivot at 50%). */
export function upsideDepositToTrackRatio(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): number {
  if (!usePivotScale(minUsd, maxUsd, pivotUsd)) {
    return logSegmentRatio(valueUsd, minUsd, maxUsd);
  }

  const clamped = Math.min(maxUsd, Math.max(minUsd, valueUsd));
  if (clamped <= pivotUsd) {
    return 0.5 * logSegmentRatio(clamped, minUsd, pivotUsd);
  }
  return 0.5 + 0.5 * logSegmentRatio(clamped, pivotUsd, maxUsd);
}

export function upsideTrackRatioToDeposit(
  ratio: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): number {
  const clampedRatio = Math.min(1, Math.max(0, ratio));

  if (!usePivotScale(minUsd, maxUsd, pivotUsd)) {
    return logSegmentDeposit(clampedRatio, minUsd, maxUsd);
  }

  if (clampedRatio <= 0.5) {
    return logSegmentDeposit(clampedRatio / 0.5, minUsd, pivotUsd);
  }
  return logSegmentDeposit((clampedRatio - 0.5) / 0.5, pivotUsd, maxUsd);
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

/** Align ticks/labels with native range thumb center (accounts for thumb width). */
export function upsideSliderThumbStyle(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): { left: string; transform: string } {
  const ratio = upsideDepositToTrackRatio(valueUsd, minUsd, maxUsd, pivotUsd);
  const half = UPSIDE_SLIDER_THUMB_PX / 2;
  return {
    left: `calc(${ratio * 100}% + ${half}px - ${ratio * UPSIDE_SLIDER_THUMB_PX}px)`,
    transform: "translateX(-50%)",
  };
}

export function upsideSliderFillBackground(
  valueUsd: number,
  minUsd: number,
  maxUsd: number,
  pivotUsd: number,
): string {
  const pct = upsideDepositToTrackRatio(valueUsd, minUsd, maxUsd, pivotUsd) * 100;
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
