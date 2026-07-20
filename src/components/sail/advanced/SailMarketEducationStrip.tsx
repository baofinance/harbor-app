"use client";

import type { DefinedMarket } from "@/config/markets";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS,
} from "@/components/shared/harborStatTileStyles";
import { formatLeverage } from "@/utils/sailDisplayFormat";
import { getSailDirectionChipLabels } from "@/utils/sailMarketDirectionLabels";

type SailMarketEducationStripProps = {
  market: DefinedMarket;
  leverageRatio?: bigint;
  className?: string;
};

const LABEL = `${HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS} text-[10px] tracking-wide`;
const VALUE = `truncate ${HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS} text-xs sm:text-sm`;

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS} px-3 sm:py-2.5`}>
      <span className={LABEL}>{label}</span>
      <span className={VALUE} title={value}>
        {value}
      </span>
    </div>
  );
}

/** Disconnected-state market facts above the chart — education instead of empty wallet CTAs. */
export function SailMarketEducationStrip({
  market,
  leverageRatio,
  className = "",
}: SailMarketEducationStripProps) {
  const { longLabel, shortLabel } = getSailDirectionChipLabels(market, "", "");
  const direction =
    longLabel && shortLabel ? `Long ${longLabel} vs ${shortLabel}` : null;

  return (
    <div className={`min-w-0 space-y-2 ${className}`.trim()}>
      {direction ? (
        <p className="text-sm font-semibold text-white/85 sm:text-base">
          {direction}
        </p>
      ) : null}
      <div
        className={`${HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS} grid grid-cols-2 divide-x divide-y divide-white/[0.08] sm:grid-cols-4 sm:divide-y-0`}
        aria-label="This market facts"
      >
        <StatCell
          label="Current leverage"
          value={formatLeverage(leverageRatio)}
        />
        <StatCell label="Funding fees" value="None" />
        <StatCell label="Leverage" value="Automatic" />
        <StatCell label="Risk" value="Variable" />
      </div>
    </div>
  );
}
