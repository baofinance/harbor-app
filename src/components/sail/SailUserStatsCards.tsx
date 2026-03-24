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

  return (
    <div className="mb-2 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Your Positions ($)
          </div>
          <div className="text-sm font-semibold text-white font-mono mt-1">
            {sailUserStats.totalPositionsUSD > 0
              ? `$${sailUserStats.totalPositionsUSD.toFixed(2)}`
              : "$0.00"}
          </div>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Avg Leverage
          </div>
          <div className="text-sm font-semibold text-white font-mono mt-1">
            {sailUserStats.averageLeverage > 0
              ? `${sailUserStats.averageLeverage.toFixed(2)}x`
              : "-"}
          </div>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Positions
          </div>
          <div className="text-sm font-semibold text-white font-mono mt-1">
            {sailUserStats.positionsCount}
          </div>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Your PnL
          </div>
          <div
            className={`text-sm font-semibold font-mono mt-1 ${
              pnlFromMarkets.totalPnL > 0
                ? "text-green-400"
                : pnlFromMarkets.totalPnL < 0
                  ? "text-red-400"
                  : "text-white"
            }`}
          >
            {pnlText}
          </div>
        </div>
      </div>
    </div>
  );
}
