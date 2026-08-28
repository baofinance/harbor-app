import type { FeeBand } from "@/utils/sailFeeBands";
import {
  DepositTradeFeeFooter,
  depositTradeFeesFromMarket,
  type DepositTradeMarketFees,
} from "@/components/deposit/DepositTradeFeeFooter";

export type SailTradeMarketFees = DepositTradeMarketFees;

type SailTradeFeeFooterProps = {
  marketFees?: SailTradeMarketFees;
  activeTab: "mint" | "redeem";
  buyFeeEstimatePct?: number;
  sellFeeEstimatePct?: number;
  showEstimates?: boolean;
  /** Show both buy/sell fees or only the active tab's fee. */
  mode?: "both" | "activeTab";
};

/** Sail trade fee row — delegates to shared `DepositTradeFeeFooter`. */
export function SailTradeFeeFooter({
  marketFees,
  activeTab,
  buyFeeEstimatePct,
  sellFeeEstimatePct,
  showEstimates = false,
  mode = "activeTab",
}: SailTradeFeeFooterProps) {
  if (!marketFees) return null;

  const activeLabel = activeTab === "mint" ? "Buy" : "Sell";

  if (mode === "both") {
    return (
      <DepositTradeFeeFooter
        heading="Fees"
        items={[
          {
            label: "Buy",
            ratio: marketFees.buyFeeRatio,
            isMintSail: true,
            activeBand: marketFees.activeBuyBand,
            estimatePct:
              showEstimates && buyFeeEstimatePct != null && buyFeeEstimatePct > 0
                ? buyFeeEstimatePct
                : undefined,
          },
          {
            label: "Sell",
            ratio: marketFees.sellFeeRatio,
            isMintSail: false,
            activeBand: marketFees.activeSellBand,
            estimatePct:
              showEstimates &&
              sellFeeEstimatePct != null &&
              sellFeeEstimatePct > 0
                ? sellFeeEstimatePct
                : undefined,
          },
        ]}
      />
    );
  }

  return (
    <DepositTradeFeeFooter
      heading={`${activeLabel} fee`}
      items={depositTradeFeesFromMarket({
        marketFees,
        activeTab,
        buyFeeEstimatePct,
        sellFeeEstimatePct,
        showEstimates,
      })}
    />
  );
}

export type { FeeBand };
