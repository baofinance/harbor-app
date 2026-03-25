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
 * Protocol-level stat tiles — Extended layout only (aligned with Sail user stats / Genesis campaign row).
 */
export function AnchorStatsStrip({ anchorStats }: AnchorStatsStripProps) {
  return (
    <div className="mb-2 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Yield Generating TVL
          </div>
          <div className="text-sm font-semibold text-white font-mono mt-1">
            {formatCompactUSD(anchorStats.yieldGeneratingTVLUSD)}
          </div>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Stability Pool TVL
          </div>
          <div className="text-sm font-semibold text-white font-mono mt-1">
            {formatCompactUSD(anchorStats.stabilityPoolTVLUSD)}
          </div>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Avg Yield Concentration
          </div>
          <div className="text-sm font-semibold text-white font-mono mt-1">
            {anchorStats.yieldConcentration > 0
              ? `${anchorStats.yieldConcentration.toFixed(2)}x`
              : "-"}
          </div>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-sm rounded-md overflow-hidden border border-white/10 px-3 py-2">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-white/80 uppercase tracking-widest">
            Highest APR Pool
          </div>
          <div className="text-sm font-semibold text-white font-mono mt-1">
            {anchorStats.bestApr > 0
              ? `${anchorStats.bestApr.toFixed(2)}%`
              : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
