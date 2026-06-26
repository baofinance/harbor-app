import type { FeeBand } from "@/utils/sailFeeBands";
import { SailFeeRatioCell } from "@/components/sail/SailFeeRatioCell";

export type SailTradeMarketFees = {
  buyFeeRatio: bigint | undefined;
  sellFeeRatio: bigint | undefined;
  activeBuyBand: FeeBand | undefined;
  activeSellBand: FeeBand | undefined;
};

type SailTradeFeeFooterProps = {
  marketFees?: SailTradeMarketFees;
  activeTab: "mint" | "redeem";
  buyFeeEstimatePct?: number;
  sellFeeEstimatePct?: number;
  showEstimates?: boolean;
};

/** Buy / sell fee row pinned to the bottom of the Sail trade panel. */
export function SailTradeFeeFooter({
  marketFees,
  activeTab,
  buyFeeEstimatePct,
  sellFeeEstimatePct,
  showEstimates = false,
}: SailTradeFeeFooterProps) {
  if (!marketFees) return null;

  return (
    <div className="rounded-md border border-[#1E4775]/10 bg-[#17395F]/5 px-3 py-2.5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#1E4775]/70">Buy fee</span>
          <div className="text-right">
            <SailFeeRatioCell
              ratio={marketFees.buyFeeRatio}
              isMintSail
              activeBand={marketFees.activeBuyBand}
            />
            {showEstimates &&
            activeTab === "mint" &&
            buyFeeEstimatePct != null &&
            buyFeeEstimatePct > 0 ? (
              <p
                className={`mt-0.5 text-[11px] font-mono ${
                  buyFeeEstimatePct > 2 && buyFeeEstimatePct <= 100
                    ? "text-red-600"
                    : "text-[#1E4775]/55"
                }`}
              >
                Est.{" "}
                {buyFeeEstimatePct > 100 ? "~1.00" : buyFeeEstimatePct.toFixed(2)}%
                {buyFeeEstimatePct > 2 && buyFeeEstimatePct <= 100 ? " ⚠️" : ""}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[#1E4775]/10 pt-2">
          <span className="text-xs font-medium text-[#1E4775]/70">Sell fee</span>
          <div className="text-right">
            <SailFeeRatioCell
              ratio={marketFees.sellFeeRatio}
              isMintSail={false}
              activeBand={marketFees.activeSellBand}
            />
            {showEstimates &&
            activeTab === "redeem" &&
            sellFeeEstimatePct != null &&
            sellFeeEstimatePct > 0 ? (
              <p
                className={`mt-0.5 text-[11px] font-mono ${
                  sellFeeEstimatePct > 2 ? "text-red-600" : "text-[#1E4775]/55"
                }`}
              >
                Est. {sellFeeEstimatePct.toFixed(2)}%
                {sellFeeEstimatePct > 2 ? " ⚠️" : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
