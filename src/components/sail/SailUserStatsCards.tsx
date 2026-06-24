import InfoTooltip from "@/components/InfoTooltip";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_GRID_3_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_GRID_7_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS,
  HARBOR_STAT_TILE_INTRO_TITLE_CLASS,
} from "@/components/shared/harborStatTileStyles";

export type SailUserStatsCardsProps = {
  isConnected: boolean;
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
  isLoadingSailMarks: boolean;
  totalSailMarks: number;
  sailMarksPerDay: number;
};

const SAIL_MARKS_TOOLTIP = (
  <div className="space-y-3">
    <div>
      <h3 className="mb-2 text-lg font-bold">Anchor Ledger Marks</h3>
      <p className="leading-relaxed text-white/90">
        Anchor Ledger Marks are earned by holding anchor tokens and depositing
        into stability pools.
      </p>
    </div>

    <div className="border-t border-white/20 pt-3">
      <p className="mb-2 leading-relaxed text-white/90">
        Each mark represents your contribution to stabilizing Harbor markets
        through token holdings and pool deposits.
      </p>
    </div>

    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-white/70">•</span>
        <p className="leading-relaxed text-white/90">
          The more you contribute, the deeper your mark on the ledger.
        </p>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-white/70">•</span>
        <p className="leading-relaxed text-white/90">
          When $TIDE surfaces, these marks will convert into your share of
          rewards and governance power.
        </p>
      </div>
    </div>

    <div className="border-t border-white/20 pt-3">
      <p className="italic leading-relaxed text-white/80">
        Think of them as a record of your journey — every mark, a line in
        Harbor&apos;s logbook.
      </p>
    </div>
  </div>
);

function formatSailMarks(value: number): string {
  if (value <= 0) return "0";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: value < 100 ? 2 : 0,
  });
}

/**
 * User positions + Sail Marks — Extended layout, single frosted strip.
 */
export function SailUserStatsCards({
  isConnected,
  sailUserStats,
  pnlFromMarkets,
  pnlSummaryLoading,
  isLoadingSailMarks,
  totalSailMarks,
  sailMarksPerDay,
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

  const marksDisplay = isLoadingSailMarks ? "-" : formatSailMarks(totalSailMarks);
  const marksPerDayDisplay = isLoadingSailMarks
    ? "-"
    : sailMarksPerDay > 0
      ? sailMarksPerDay.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "0";

  const gridClass = isConnected
    ? HARBOR_STAT_TILE_INTRO_STRIP_GRID_7_CLASS
    : HARBOR_STAT_TILE_INTRO_STRIP_GRID_3_CLASS;

  return (
    <div className="mb-2">
      <div className={HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS}>
        <div className={gridClass}>
          {isConnected ? (
            <>
              <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
                  Your Positions ($)
                </div>
                <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
                  {sailUserStats.totalPositionsUSD > 0
                    ? `$${sailUserStats.totalPositionsUSD.toFixed(2)}`
                    : "$0.00"}
                </div>
              </div>

              <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
                  Avg Leverage
                </div>
                <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
                  {sailUserStats.averageLeverage > 0
                    ? `${sailUserStats.averageLeverage.toFixed(2)}x`
                    : "-"}
                </div>
              </div>

              <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
                  Positions
                </div>
                <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
                  {sailUserStats.positionsCount}
                </div>
              </div>

              <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
                <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
                  Your PnL
                </div>
                <div
                  className={`${HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS} ${pnlValueClass}`}
                >
                  {pnlText}
                </div>
              </div>
            </>
          ) : null}

          <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
            <div className="flex items-center justify-center gap-2">
              <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Sail Marks</h2>
              <InfoTooltip
                centerOnMobile
                label={SAIL_MARKS_TOOLTIP}
                side="right"
              />
            </div>
          </div>

          <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
              Current Sail Marks
            </div>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
              {marksDisplay}
            </div>
          </div>

          <div className={HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS}>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS}>
              Sail Marks per Day
            </div>
            <div className={HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS}>
              {marksPerDayDisplay}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
