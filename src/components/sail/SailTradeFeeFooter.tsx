import Link from "next/link";
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

function FeeEstimate({
  pct,
  warnHigh,
}: {
  pct: number;
  warnHigh?: boolean;
}) {
  return (
    <span
      className={`font-mono text-[10px] tabular-nums ${
        warnHigh ? "text-red-600" : "text-[#1E4775]/50"
      }`}
    >
      est. {pct > 100 ? "~1.00" : pct.toFixed(2)}%
      {warnHigh ? " ⚠️" : ""}
    </span>
  );
}

/** Buy / sell fees — compact row pinned to the bottom of the Sail trade panel. */
export function SailTradeFeeFooter({
  marketFees,
  activeTab,
  buyFeeEstimatePct,
  sellFeeEstimatePct,
  showEstimates = false,
}: SailTradeFeeFooterProps) {
  if (!marketFees) return null;

  const showBuyEstimate =
    showEstimates &&
    activeTab === "mint" &&
    buyFeeEstimatePct != null &&
    buyFeeEstimatePct > 0;

  const showSellEstimate =
    showEstimates &&
    activeTab === "redeem" &&
    sellFeeEstimatePct != null &&
    sellFeeEstimatePct > 0;

  return (
    <div className="rounded-md border border-[#1E4775]/10 bg-[#17395F]/5 px-3 py-2.5">
      <p className="flex flex-wrap items-baseline gap-x-2 text-[10px] leading-snug">
        <span className="font-semibold uppercase tracking-wide text-[#1E4775]/55">
          Fees
        </span>
        <Link
          href="/transparency"
          className="text-[#1E4775]/55 underline-offset-2 transition-colors hover:text-[#1E4775] hover:underline"
        >
          full fee structure
        </Link>
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E4775]/70">
          Buy
          <SailFeeRatioCell
            ratio={marketFees.buyFeeRatio}
            isMintSail
            activeBand={marketFees.activeBuyBand}
          />
          {showBuyEstimate ? (
            <FeeEstimate
              pct={buyFeeEstimatePct!}
              warnHigh={
                buyFeeEstimatePct! > 2 && buyFeeEstimatePct! <= 100
              }
            />
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E4775]/70">
          Sell
          <SailFeeRatioCell
            ratio={marketFees.sellFeeRatio}
            isMintSail={false}
            activeBand={marketFees.activeSellBand}
          />
          {showSellEstimate ? (
            <FeeEstimate
              pct={sellFeeEstimatePct!}
              warnHigh={sellFeeEstimatePct! > 2}
            />
          ) : null}
        </span>
      </div>
    </div>
  );
}
