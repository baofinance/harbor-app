"use client";

import type { DefinedMarket } from "@/config/markets";
import { useSailPositionPnL } from "@/hooks/useSailPositionPnL";
import { formatPnL, formatUSD } from "@/utils/sailDisplayFormat";
import { SAIL_ADVANCED_CAPTION, SAIL_ADVANCED_FROSTED_CARD } from "./sailAdvancedStyles";

export type SailMarketPositionBarProps = {
  market: DefinedMarket;
  userDeposit?: bigint;
  currentValueUSD?: number;
  leveragedTokenPriceUSD?: number;
  isConnected: boolean;
};

const SAIL_POSITION_STAT_CARD = `${SAIL_ADVANCED_FROSTED_CARD} flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-2 text-center sm:px-4 sm:py-2.5`;

const SAIL_POSITION_BAR_VALUE =
  "mt-0.5 font-mono text-sm font-semibold tabular-nums text-white sm:text-base";

function formatPositionPnL(
  unrealizedPnL: number,
  unrealizedPnLPercent: number,
  isLoading: boolean,
  hasPosition: boolean,
  isConnected: boolean,
): { text: string; valueClassName: string } {
  if (!isConnected || !hasPosition) {
    return { text: "—", valueClassName: SAIL_POSITION_BAR_VALUE };
  }
  if (isLoading) {
    return { text: "…", valueClassName: SAIL_POSITION_BAR_VALUE };
  }

  if (unrealizedPnL === 0) {
    return { text: "—", valueClassName: SAIL_POSITION_BAR_VALUE };
  }

  const formatted = formatPnL(unrealizedPnL);
  const pctText = ` (${unrealizedPnLPercent >= 0 ? "+" : ""}${unrealizedPnLPercent.toFixed(1)}%)`;
  const colorClass =
    unrealizedPnL > 0
      ? `${SAIL_POSITION_BAR_VALUE} text-harbor-mint`
      : `${SAIL_POSITION_BAR_VALUE} text-harbor-coral`;

  return {
    text: `${formatted.text}${pctText}`,
    valueClassName: colorClass,
  };
}

/** Per-market position value and PnL — sits above the price chart. */
export function SailMarketPositionBar({
  market,
  userDeposit,
  currentValueUSD,
  leveragedTokenPriceUSD,
  isConnected,
}: SailMarketPositionBarProps) {
  const hasPosition = userDeposit !== undefined && userDeposit > 0n;
  const leveragedTokenAddress = market.addresses?.leveragedToken as
    | `0x${string}`
    | undefined;

  const pnlSubgraph = useSailPositionPnL({
    tokenAddress: leveragedTokenAddress || "",
    minterAddress: market.addresses?.minter as `0x${string}` | undefined,
    startBlock: (market as { startBlock?: number }).startBlock,
    genesisAddress: market.addresses?.genesis as `0x${string}` | undefined,
    genesisLeveragedRatio: market.genesis?.tokenDistribution?.leveraged
      ?.ratio as number | undefined,
    pegTarget: market.pegTarget as "ETH" | "BTC" | undefined,
    currentTokenPrice: leveragedTokenPriceUSD,
    enabled: !!leveragedTokenAddress && hasPosition,
  });

  const positionValue =
    !isConnected || !hasPosition
      ? "—"
      : currentValueUSD !== undefined
        ? formatUSD(currentValueUSD)
        : "—";

  const pnl = formatPositionPnL(
    pnlSubgraph.unrealizedPnL ?? 0,
    pnlSubgraph.unrealizedPnLPercent ?? 0,
    pnlSubgraph.isLoading,
    hasPosition,
    isConnected,
  );

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:gap-3"
      aria-label="Your position in this market"
    >
      <div className={SAIL_POSITION_STAT_CARD}>
        <span className={SAIL_ADVANCED_CAPTION}>Your position</span>
        <span className={SAIL_POSITION_BAR_VALUE}>{positionValue}</span>
      </div>
      <div className={SAIL_POSITION_STAT_CARD}>
        <span className={SAIL_ADVANCED_CAPTION}>PnL</span>
        <span className={pnl.valueClassName}>{pnl.text}</span>
      </div>
    </div>
  );
}
