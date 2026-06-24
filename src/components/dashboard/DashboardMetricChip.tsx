"use client";

import { HarborStatTile } from "@/components/shared/HarborStatTile";
import {
  HARBOR_STAT_TILE_GLASS_CHIP_LABEL_CLASS,
  HARBOR_STAT_TILE_GLASS_CHIP_VALUE_CLASS,
} from "@/components/shared/harborStatTileStyles";

export type DashboardMetricChipProps = {
  label: string;
  value: string;
  valueClassName?: string;
  /** Compact chips for the page-level stat strip. */
  inline?: boolean;
};

export function DashboardMetricChip({
  label,
  value,
  valueClassName = HARBOR_STAT_TILE_GLASS_CHIP_VALUE_CLASS,
  inline = false,
}: DashboardMetricChipProps) {
  return (
    <HarborStatTile variant={inline ? "glassChipInline" : "glassChip"}>
      <p
        className={`w-full ${HARBOR_STAT_TILE_GLASS_CHIP_LABEL_CLASS} ${
          inline ? "text-xs md:text-[11px] lg:text-xs xl:text-sm" : "text-sm"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 w-full truncate font-mono tabular-nums font-semibold ${valueClassName} ${
          inline ? "text-sm md:text-xs lg:text-sm xl:text-base" : ""
        }`}
      >
        {value}
      </p>
    </HarborStatTile>
  );
}
