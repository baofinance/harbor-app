"use client";

import dynamic from "next/dynamic";
import type { DefinedMarket } from "@/config/markets";
import { pegTargetToAssetKey } from "@/utils/pegAssetChart";
import {
  ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL,
  ANCHOR_ADVANCED_LIGHT_BODY,
} from "./anchorAdvancedStyles";

const PegTargetUsdChart = dynamic(
  () =>
    import("@/components/charts/PegTargetUsdChart").then(
      (m) => m.PegTargetUsdChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-48 items-center justify-center text-sm text-[#1E4775]/60">
        Loading chart…
      </div>
    ),
  },
);

type AnchorMarketChartColumnProps = {
  market: DefinedMarket;
};

export function AnchorMarketChartColumn({ market }: AnchorMarketChartColumnProps) {
  const pegTarget = market.pegTarget || "USD";
  const assetKey = pegTargetToAssetKey(pegTarget);

  return (
    <div
      className={`flex h-full min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl p-3 sm:min-h-[26rem] ${ANCHOR_ADVANCED_FROSTED_LIGHT_PANEL}`}
    >
      <div className="min-h-0 flex-1">
        {assetKey ? (
          <PegTargetUsdChart asset={assetKey} className="h-full" />
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center px-6 text-center">
            <p className={ANCHOR_ADVANCED_LIGHT_BODY}>
              Price chart is not available for peg target &ldquo;{pegTarget}
              &rdquo;.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
