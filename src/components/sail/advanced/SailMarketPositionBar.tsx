"use client";

import { HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS } from "@/components/shared/harborStatTileStyles";
import type { DefinedMarket } from "@/config/markets";
import { useSailPositionPnL } from "@/hooks/useSailPositionPnL";
import { formatPnL, formatUSD } from "@/utils/sailDisplayFormat";
import { SAIL_ADVANCED_FROSTED_CARD } from "./sailAdvancedStyles";

export type SailMarketPositionBarProps = {
  market: DefinedMarket;
  userDeposit?: bigint;
  currentValueUSD?: number;
  leveragedTokenPriceUSD?: number;
  isConnected: boolean;
};

const SAIL_POSITION_STAT_LABEL =
  "whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-white/55";

const SAIL_POSITION_STAT_VALUE =
  "mt-0.5 truncate font-mono text-xs font-semibold tabular-nums text-white/90";

const SAIL_POSITION_STAT_CARD = `${SAIL_ADVANCED_FROSTED_CARD} ${HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS} min-w-0 flex-1 px-2.5 py-1.5 sm:px-3`;

function formatPositionPnL(
  unrealizedPnL: number,
  unrealizedPnLPercent: number,
  isLoading: boolean,
  hasPosition: boolean,
  isConnected: boolean,
): { text: string; valueClassName: string } {
  if (!isConnected || !hasPosition) {
    return { text: "—", valueClassName: SAIL_POSITION_STAT_VALUE };
  }
  if (isLoading) {
    return { text: "…", valueClassName: SAIL_POSITION_STAT_VALUE };
  }

  if (unrealizedPnL === 0) {
    return { text: "—", valueClassName: SAIL_POSITION_STAT_VALUE };
  }

  const formatted = formatPnL(unrealizedPnL);
  const pctText = ` (${unrealizedPnLPercent >= 0 ? "+" : ""}${unrealizedPnLPercent.toFixed(2)}%)`;
  const colorClass =
    unrealizedPnL > 0
      ? `${SAIL_POSITION_STAT_VALUE} text-harbor-mint`
      : `${SAIL_POSITION_STAT_VALUE} text-harbor-coral`;

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
        <span className={SAIL_POSITION_STAT_LABEL}>Your position</span>
        <span className={SAIL_POSITION_STAT_VALUE}>{positionValue}</span>
      </div>
      <div className={SAIL_POSITION_STAT_CARD}>
        <span className={SAIL_POSITION_STAT_LABEL}>PnL</span>
        <span className={pnl.valueClassName}>{pnl.text}</span>
      </div>
    </div>
  );
}
