import { HarborStatTile } from "@/components/shared/HarborStatTile";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
} from "@/components/shared/harborStatTileStyles";
import { formatCompactUSD } from "@/utils/anchor";

export type AnchorStatsStripProps = {
  anchorStats: {
    yieldGeneratingTVLUSD: number;
    stabilityPoolTVLUSD: number;
    yieldConcentration: number;
    bestApr: number;
  };
};

/**
 * Protocol-level stat tiles — Extended layout only.
 */
export function AnchorStatsStrip({ anchorStats }: AnchorStatsStripProps) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
      <HarborStatTile variant="intro">
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
          Yield Generating TVL
        </div>
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
          {formatCompactUSD(anchorStats.yieldGeneratingTVLUSD)}
        </div>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
          Stability Pool TVL
        </div>
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
          {formatCompactUSD(anchorStats.stabilityPoolTVLUSD)}
        </div>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
          Avg Yield Concentration
        </div>
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
          {anchorStats.yieldConcentration > 0
            ? `${anchorStats.yieldConcentration.toFixed(2)}x`
            : "-"}
        </div>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
          Highest APR Pool
        </div>
        <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
          {anchorStats.bestApr > 0
            ? `${anchorStats.bestApr.toFixed(2)}%`
            : "-"}
        </div>
      </HarborStatTile>
    </div>
  );
}
