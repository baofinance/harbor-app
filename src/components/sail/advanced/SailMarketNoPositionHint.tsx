"use client";

import { SAIL_ADVANCED_CAPTION, SAIL_ADVANCED_FROSTED_CARD } from "./sailAdvancedStyles";

type SailMarketNoPositionHintProps = {
  isConnected: boolean;
};

/** Shown above the chart when the user has no open position in the selected market. */
export function SailMarketNoPositionHint({
  isConnected,
}: SailMarketNoPositionHintProps) {
  return (
    <p
      className={`${SAIL_ADVANCED_FROSTED_CARD} px-3 py-2 text-center ${SAIL_ADVANCED_CAPTION} text-white/65`}
      role="status"
    >
      {isConnected
        ? "No position in this market. Use Trade to mint and open a position."
        : "Connect your wallet to view your position in this market."}
    </p>
  );
}
