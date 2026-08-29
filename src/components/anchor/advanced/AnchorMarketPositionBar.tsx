"use client";

import type { DefinedMarket } from "@/config/markets";
import { SailConnectWalletStripNotice } from "@/components/sail/advanced/SailConnectWalletStripNotice";
import { formatAPR } from "@/utils/anchor";
import { formatUSD } from "@/utils/formatters";
import {
  ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE,
  ANCHOR_ADVANCED_HEADER_STRIP_LABEL,
  ANCHOR_ADVANCED_HEADER_STRIP_SHELL,
  ANCHOR_ADVANCED_HEADER_STRIP_VALUE,
} from "./anchorAdvancedStyles";

export type AnchorMarketPositionBarProps = {
  market: DefinedMarket;
  isConnected: boolean;
  positionUSD?: number;
  collateralPoolUSD?: number;
  sailPoolUSD?: number;
  bestApr?: number;
  haTokenPriceUSD?: number;
  className?: string;
};

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center sm:px-4">
      <span className={ANCHOR_ADVANCED_HEADER_STRIP_LABEL}>{label}</span>
      <span className={ANCHOR_ADVANCED_HEADER_STRIP_VALUE} title={value}>
        {value}
      </span>
    </div>
  );
}

export function AnchorMarketPositionBar({
  market,
  isConnected,
  positionUSD,
  collateralPoolUSD = 0,
  sailPoolUSD = 0,
  bestApr,
  haTokenPriceUSD,
  className = "",
}: AnchorMarketPositionBarProps) {
  const shellClass = `${ANCHOR_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-2 ${ANCHOR_ADVANCED_HEADER_STRIP_DIVIDE} sm:grid-cols-4 sm:divide-y-0 ${className}`.trim();

  if (!isConnected) {
    return (
      <div className={shellClass} aria-label="Your position in this market">
        <SailConnectWalletStripNotice
          message="Connect your wallet to view your position in this market."
          className="col-span-2 sm:col-span-4"
        />
      </div>
    );
  }

  const hasPosition = (positionUSD ?? 0) > 0;
  const pegLabel = market.pegTarget || "USD";

  return (
    <div className={shellClass} aria-label="Your position in this market">
      <StatCell
        label="Your position"
        value={hasPosition ? formatUSD(positionUSD ?? 0) : "—"}
      />
      <StatCell
        label="Collateral pool"
        value={collateralPoolUSD > 0 ? formatUSD(collateralPoolUSD) : "—"}
      />
      <StatCell
        label="Sail pool"
        value={sailPoolUSD > 0 ? formatUSD(sailPoolUSD) : "—"}
      />
      <StatCell
        label={bestApr && bestApr > 0 ? "Best APR" : `ha / ${pegLabel}`}
        value={
          bestApr && bestApr > 0
            ? formatAPR(bestApr)
            : haTokenPriceUSD !== undefined && haTokenPriceUSD > 0
              ? formatUSD(haTokenPriceUSD)
              : "—"
        }
      />
    </div>
  );
}
