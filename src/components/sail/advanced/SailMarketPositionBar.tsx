"use client";

import type { DefinedMarket } from "@/config/markets";
import { useSailPositionPnL } from "@/hooks/useSailPositionPnL";
import { formatPnL, formatUSD } from "@/utils/sailDisplayFormat";
import {
  HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS,
  HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS,
  HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS,
} from "@/components/shared/harborStatTileStyles";

export type SailMarketPositionBarProps = {
  market: DefinedMarket;
  userDeposit?: bigint;
  currentValueUSD?: number;
  leveragedTokenPriceUSD?: number;
  isConnected: boolean;
};

const SAIL_POSITION_STAT_VALUE = `truncate ${HARBOR_STAT_TILE_INTRO_METRIC_VALUE_CLASS} text-xs`;

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

/** Per-market position value and PnL — header row beside wallet stats. */
export function SailMarketPositionBar({
  market,
  userDeposit,
  currentValueUSD,
  leveragedTokenPriceUSD,
  isConnected,
  embedded = false,
  className = "",
}: SailMarketPositionBarProps & {
  embedded?: boolean;
  className?: string;
}) {
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

  const shellClass = embedded
    ? `grid w-full grid-cols-2 divide-x divide-white/[0.08] ${className}`.trim()
    : `${HARBOR_STAT_TILE_INTRO_STRIP_SHELL_CLASS} grid grid-cols-2 divide-x divide-white/[0.08] ${className}`.trim();

  return (
    <div className={shellClass} aria-label="Your position in this market">
      <div className={`${HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS} px-3 sm:py-2.5`}>
        <span className={`${HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS} text-[10px] tracking-wide`}>
          Your position
        </span>
        <span className={SAIL_POSITION_STAT_VALUE}>{positionValue}</span>
      </div>
      <div className={`${HARBOR_STAT_TILE_INTRO_STRIP_CELL_CLASS} px-3 sm:py-2.5`}>
        <span className={`${HARBOR_STAT_TILE_INTRO_METRIC_LABEL_CLASS} text-[10px] tracking-wide`}>
          PnL
        </span>
        <span className={pnl.valueClassName}>{pnl.text}</span>
      </div>
    </div>
  );
}
