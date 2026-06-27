"use client";

import {
  SAIL_ADVANCED_FROSTED_LIGHT_PANEL,
  SAIL_ADVANCED_LIGHT_BODY,
} from "./sailAdvancedStyles";

type SailMarketNoPositionHintProps = {
  isConnected: boolean;
};

/** Shown above the chart when the user has no open position in the selected market. */
export function SailMarketNoPositionHint({
  isConnected,
}: SailMarketNoPositionHintProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl px-3 py-2.5 text-center ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} ${SAIL_ADVANCED_LIGHT_BODY}`}
      role="status"
    >
      {isConnected
        ? "No position in this market. Use Trade to buy and open a position."
        : "Connect your wallet to view your position in this market."}
    </div>
  );
}
