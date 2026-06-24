import { formatCompactUSD } from "@/utils/anchor";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_GRID_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS,
} from "@/components/shared/harborStatTileStyles";

export type AnchorStatsStripProps = {
  anchorStats: {
    yieldGeneratingTVLUSD: number;
    stabilityPoolTVLUSD: number;
    yieldConcentration: number;
    bestApr: number;
  };
};

/**
 * Protocol-level stat tiles — Extended layout only (aligned with Sail user stats / Genesis campaign row).
 */
export function AnchorStatsStrip({ anchorStats }: AnchorStatsStripProps) {
  return (
    <div className="mb-2">
      <div className={HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS}>
        <div className={HARBOR_STAT_TILE_INTRO_STRIP_GRID_CLASS}>
          <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
              Yield Generating TVL
            </div>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
              {formatCompactUSD(anchorStats.yieldGeneratingTVLUSD)}
            </div>
          </div>

          <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
              Stability Pool TVL
            </div>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
              {formatCompactUSD(anchorStats.stabilityPoolTVLUSD)}
            </div>
          </div>

          <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
              Avg Yield Concentration
            </div>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
              {anchorStats.yieldConcentration > 0
                ? `${anchorStats.yieldConcentration.toFixed(2)}x`
                : "-"}
            </div>
          </div>

          <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
              Highest APR Pool
            </div>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
              {anchorStats.bestApr > 0
                ? `${anchorStats.bestApr.toFixed(2)}%`
                : "-"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
