import { formatCompactUSD } from "@/utils/anchor";

export type AnchorVaprPositionApr = {
  poolType: "collateral" | "sail";
  marketId: string;
  depositUSD: number;
  apr: number;
};

export type AnchorProjectedAprTooltipData = {
  collateralPoolAPR: number | null;
  leveragedPoolAPR: number | null;
  harvestableAmount: bigint | null;
  remainingDays: number | null;
};

type AnchorVaprTooltipContentProps = {
  positionAPRs: AnchorVaprPositionApr[];
  blendedAPR: number;
  showLiveAprLoading: boolean;
  isErrorAllRewards: boolean;
  projectedAPR: AnchorProjectedAprTooltipData;
};

export function AnchorVaprTooltipContent({
  positionAPRs,
  blendedAPR,
  showLiveAprLoading,
  isErrorAllRewards,
  projectedAPR,
}: AnchorVaprTooltipContentProps) {
  return (
    <div className="text-left">
      <div className="font-semibold mb-1">Blended APR from Your Positions</div>
      {positionAPRs.length > 0 ? (
        <div className="text-xs space-y-1">
          {positionAPRs.length > 10 ? (
            <>
              <div>• Total positions: {positionAPRs.length}</div>
              {(() => {
                const collateralCount = positionAPRs.filter(
                  (pos) => pos.poolType === "collateral"
                ).length;
                const sailCount = positionAPRs.filter(
                  (pos) => pos.poolType === "sail"
                ).length;
                return (
                  <>
                    {collateralCount > 0 && (
                      <div className="ml-2">- Collateral: {collateralCount}</div>
                    )}
                    {sailCount > 0 && <div className="ml-2">- Sail: {sailCount}</div>}
                  </>
                );
              })()}
              <div className="mt-2 pt-2 border-t border-white/20 font-semibold">
                Weighted Average: {blendedAPR > 0 ? `${blendedAPR.toFixed(2)}%` : "-"}
              </div>
            </>
          ) : (
            <>
              {positionAPRs.map((pos, idx) => (
                <div key={idx}>
                  • {pos.poolType === "collateral" ? "Collateral" : "Sail"} Pool (
                  {pos.marketId}): {pos.apr.toFixed(2)}% (
                  {formatCompactUSD(pos.depositUSD)})
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-white/20 font-semibold">
                Weighted Average: {blendedAPR > 0 ? `${blendedAPR.toFixed(2)}%` : "-"}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="text-xs">No stability pool positions found</div>
      )}

      {!showLiveAprLoading &&
        !isErrorAllRewards &&
        projectedAPR.harvestableAmount !== null &&
        projectedAPR.harvestableAmount > 0n &&
        blendedAPR <= 0 && (
          <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90">
            Projected APR (next 7 days):{" "}
            {projectedAPR.collateralPoolAPR !== null &&
              `${projectedAPR.collateralPoolAPR.toFixed(2)}% (Collateral)`}
            {projectedAPR.collateralPoolAPR !== null &&
              projectedAPR.leveragedPoolAPR !== null &&
              " / "}
            {projectedAPR.leveragedPoolAPR !== null &&
              `${projectedAPR.leveragedPoolAPR.toFixed(2)}% (Sail)`}
            <br />
            Based on{" "}
            {(Number(projectedAPR.harvestableAmount) / 1e18).toFixed(4)} wstETH
            harvestable.
            {projectedAPR.remainingDays !== null &&
              ` ~${projectedAPR.remainingDays.toFixed(1)} days until harvest.`}
          </div>
        )}
    </div>
  );
}
