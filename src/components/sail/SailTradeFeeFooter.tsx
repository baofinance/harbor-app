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
  /** Show both buy/sell fees or only the active tab's fee. */
  mode?: "both" | "activeTab";
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
  mode = "activeTab",
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

  const showBuy = mode === "both" || activeTab === "mint";
  const showSell = mode === "both" || activeTab === "redeem";
  const activeLabel = activeTab === "mint" ? "Buy" : "Sell";

  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[10px] leading-snug text-[#1E4775]/55">
      <span className="font-semibold uppercase tracking-wide">
        {mode === "activeTab" ? `${activeLabel} fee` : "Fees"}
      </span>
      {showBuy ? (
        <span className="inline-flex items-center gap-1.5">
          {mode === "both" ? <span>Buy</span> : null}
          <SailFeeRatioCell
            ratio={marketFees.buyFeeRatio}
            isMintSail
            activeBand={marketFees.activeBuyBand}
          />
          {showBuyEstimate ? (
            <FeeEstimate
              pct={buyFeeEstimatePct!}
              warnHigh={buyFeeEstimatePct! > 2 && buyFeeEstimatePct! <= 100}
            />
          ) : null}
        </span>
      ) : null}
      {showBuy && showSell ? <span aria-hidden="true">·</span> : null}
      {showSell ? (
        <span className="inline-flex items-center gap-1.5">
          {mode === "both" ? <span>Sell</span> : null}
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
      ) : null}
      <span aria-hidden="true">·</span>
      <Link
        href="/transparency"
        className="underline-offset-2 transition-colors hover:text-[#1E4775] hover:underline"
      >
        full fee structure
      </Link>
    </p>
  );
}
