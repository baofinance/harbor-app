/**
 * Harbor fee-band pill + row styling (Nautical Blue, Seafoam, Coral).
 * Use these classes wherever fee tiers are shown — Sail badges, tooltip panels,
 * transparency “Fees & Incentives”, etc.
 */
import type { FeeBand as SailFeeBand } from "@/utils/sailFeeBands";
import { WAD } from "@/utils/sailFeeBands";

export type HarborFeeBandKind = "blocked" | "free" | "discount" | "fee";

/**
 * Compact pill surfaces — pastel fills anchored to Harbor hexes; **blocked** is fully
 * charcoal-scale (no nautical tint on the pill).
 *
 * Hue map: nautical blue (#1E4775), seafoam (#B8EBD5 lineage), coral (#FF8A7A).
 */
export const HARBOR_FEE_BAND_PILL_CLASS: Record<HarborFeeBandKind, string> = {
  blocked:
    "bg-[#D8DADF] text-[#10141A] font-semibold border-2 border-[#10141A] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
  /** Free tier: light tint of nautical blue (not seafoam). */
  free:
    "bg-[#E0E9F5] text-[#1E4775] font-semibold ring-2 ring-[#2F5F8F]/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
  discount:
    "bg-[#C5ECD9] text-[#1A5C47] font-semibold ring-2 ring-[#2F6B52] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
  fee:
    "bg-[#FFD8CF] text-[#A63B2A] font-semibold ring-2 ring-[#E86B56] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
};

/** Active band row highlight (panels + tooltip lists). */
export const HARBOR_FEE_BAND_ROW_ACTIVE_CLASS =
  "border border-[#4A9784]/80 bg-[#B8EBD5]/14";
/** Inactive rows in fee lists. */
export const HARBOR_FEE_BAND_ROW_QUIET_CLASS =
  "border border-[#1E4775]/12 bg-[#1E4775]/[0.04]";

/** Text for CR range spans in panels — charcoal for contrast on tinted rows. */
export const HARBOR_FEE_BAND_RANGE_TEXT_CLASS =
  "font-mono text-[11px] font-medium tabular-nums text-[#10141A]/95";

function shouldBlockMintSail(
  ratio: bigint,
  lowerBound: bigint,
  upperBound: bigint | undefined,
  isMintSail: boolean
): boolean {
  const tolerance = 10n ** 14n;
  const ratioAbs = ratio < 0n ? -ratio : ratio;
  const isZeroToHundredRange = lowerBound === 0n && upperBound !== undefined;
  const is100PercentOrClose =
    ratioAbs >= WAD - tolerance && ratioAbs <= WAD;
  return isMintSail && isZeroToHundredRange && is100PercentOrClose;
}

/**
 * Normalize fee-ratio + band bounds → Harbor semantic kind (used for pill styling).
 */
export function resolveHarborFeeBandKind(
  ratio: bigint,
  isMintSail: boolean,
  lowerBound: bigint,
  upperBound: bigint | undefined
): HarborFeeBandKind {
  const isBlocked =
    ratio >= WAD || shouldBlockMintSail(ratio, lowerBound, upperBound, isMintSail);
  if (isBlocked) return "blocked";
  if (ratio === 0n) return "free";
  if (ratio < 0n) return "discount";
  return "fee";
}

export function harborFeeBandPillClassFromRatio(
  ratio: bigint,
  isMintSail: boolean,
  lowerBound?: bigint,
  upperBound?: bigint
): string {
  const lb = lowerBound ?? 0n;
  return HARBOR_FEE_BAND_PILL_CLASS[
    resolveHarborFeeBandKind(ratio, isMintSail, lb, upperBound)
  ];
}

/** True when collateral ratio sits in this fee band row. */
export function isCollateralRatioInFeeBandRow(
  collateralRatio: bigint | undefined,
  band: SailFeeBand
): boolean {
  if (collateralRatio === undefined) return false;
  if (collateralRatio < band.lowerBound) return false;
  if (
    band.upperBound !== undefined &&
    collateralRatio > band.upperBound
  ) {
    return false;
  }
  return true;
}
