import type { ReactNode } from "react";
import {
  HARBOR_STAT_TILE_GLASS_CHIP_CLASS,
  HARBOR_STAT_TILE_GLASS_CHIP_INLINE_CLASS,
  HARBOR_STAT_TILE_INTRO_CLASS,
  HARBOR_STAT_TILE_INTRO_RING_ACCENT_CLASS,
  HARBOR_STAT_TILE_INTRO_RING_ACCENT_STRONG_CLASS,
} from "./harborStatTileStyles";

export type HarborStatTileVariant = "intro" | "glassChip" | "glassChipInline";

export type HarborStatTileAccent = "none" | "ring" | "ringStrong";

export type HarborStatTileProps = {
  variant?: HarborStatTileVariant;
  accent?: HarborStatTileAccent;
  className?: string;
  children: ReactNode;
};

function shellClass(variant: HarborStatTileVariant): string {
  switch (variant) {
    case "glassChip":
      return HARBOR_STAT_TILE_GLASS_CHIP_CLASS;
    case "glassChipInline":
      return HARBOR_STAT_TILE_GLASS_CHIP_INLINE_CLASS;
    case "intro":
    default:
      return HARBOR_STAT_TILE_INTRO_CLASS;
  }
}

function accentClass(accent: HarborStatTileAccent): string {
  switch (accent) {
    case "ring":
      return HARBOR_STAT_TILE_INTRO_RING_ACCENT_CLASS;
    case "ringStrong":
      return HARBOR_STAT_TILE_INTRO_RING_ACCENT_STRONG_CLASS;
    default:
      return "";
  }
}

export function HarborStatTile({
  variant = "intro",
  accent = "none",
  className = "",
  children,
}: HarborStatTileProps) {
  return (
    <div className={`${shellClass(variant)} ${accentClass(accent)} ${className}`.trim()}>
      {children}
    </div>
  );
}
