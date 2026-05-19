import { getSailPegAssetLogoPath } from "@/lib/logos";

/** Sail long/short: peg badges (USD/GOLD/SILVER) vs standard token logos. */
export function getSailSideLogoPath(side: string): string {
  return getSailPegAssetLogoPath(side);
}

function normalizeSideKey(side: string): string {
  return side.toLowerCase().trim();
}

/** True when this side uses a custom peg badge (`sail-asset-*.png`). */
export function isSailPegAssetSide(side: string): boolean {
  const key = normalizeSideKey(side);
  return (
    key === "usd" ||
    key === "dollar" ||
    key === "gold" ||
    key === "xau" ||
    key === "silver" ||
    key === "xag"
  );
}

/** hs·leveraged token column in the UI+ table. */
export const SAIL_TABLE_HS_ICON_PX = 18;

/** Long/short collateral & peg labels — default token logos. */
export const SAIL_TABLE_SIDE_ICON_PX = 18;
export const SAIL_TABLE_SIDE_ICON_MOBILE_PX = 26;

/**
 * Peg badges have more padding in the PNG; render larger so they match hs token visual size.
 */
export const SAIL_PEG_ICON_TABLE_PX = 26;
export const SAIL_PEG_ICON_TABLE_MOBILE_PX = 30;

export function sailTableSideIconPx(
  side: string,
  variant: "desktop" | "mobile"
): number {
  if (isSailPegAssetSide(side)) {
    return variant === "mobile"
      ? SAIL_PEG_ICON_TABLE_MOBILE_PX
      : SAIL_PEG_ICON_TABLE_PX;
  }
  return variant === "mobile"
    ? SAIL_TABLE_SIDE_ICON_MOBILE_PX
    : SAIL_TABLE_SIDE_ICON_PX;
}
