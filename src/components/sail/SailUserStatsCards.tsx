import { HarborStatTile } from "@/components/shared/HarborStatTile";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
} from "@/components/shared/harborStatTileStyles";

export type SailUserStatsCardsProps = {
  sailUserStats: {
    totalPositionsUSD: number;
    averageLeverage: number;
    positionsCount: number;
  };
  pnlFromMarkets: {
    totalPnL: number;
    pnlPercent: number | null;
  };
  pnlSummaryLoading: boolean;
};

/**
 * Four user summary tiles (positions, leverage, count, PnL) — Extended, wallet connected.
 */
export function SailUserStatsCards({
  sailUserStats,
  pnlFromMarkets,
  pnlSummaryLoading,
}: SailUserStatsCardsProps) {
  const pnlText = pnlSummaryLoading
    ? "-"
    : (() => {
        const v = pnlFromMarkets.totalPnL;
        const pct = pnlFromMarkets.pnlPercent;
        if (!v) return "$0.00";
        const dollar = `$${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
        const pctText =
          pct === null || !Number.isFinite(pct)
            ? ""
            : ` (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`;
        return `${dollar}${pctText}`;
      })();

  const pnlValueClass =
    pnlFromMarkets.totalPnL > 0
      ? "text-harbor-mint"
      : pnlFromMarkets.totalPnL < 0
        ? "text-harbor-coral"
        : "text-white";

  return (
    <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <HarborStatTile variant="intro">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
            Your Positions ($)
          </div>
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
            {sailUserStats.totalPositionsUSD > 0
              ? `$${sailUserStats.totalPositionsUSD.toFixed(2)}`
              : "$0.00"}
          </div>
        </div>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
            Avg Leverage
          </div>
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
            {sailUserStats.averageLeverage > 0
              ? `${sailUserStats.averageLeverage.toFixed(2)}x`
              : "-"}
          </div>
        </div>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>Positions</div>
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
            {sailUserStats.positionsCount}
          </div>
        </div>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="flex flex-col items-center justify-center text-center">
          <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>Your PnL</div>
          <div
            className={`${HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS} ${pnlValueClass}`}
          >
            {pnlText}
          </div>
        </div>
      </HarborStatTile>
    </div>
  );
}
