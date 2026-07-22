"use client";

import type { DefinedMarket } from "@/config/markets";
import { SailConnectWalletStripNotice } from "@/components/sail/advanced/SailConnectWalletStripNotice";
import {
  SAIL_ADVANCED_HEADER_STRIP_DIVIDE,
  SAIL_ADVANCED_HEADER_STRIP_LABEL,
  SAIL_ADVANCED_HEADER_STRIP_SHELL,
  SAIL_ADVANCED_HEADER_STRIP_VALUE,
} from "@/components/sail/advanced/sailAdvancedStyles";
import { useSailPositionPnL } from "@/hooks/useSailPositionPnL";
import {
  formatLeverage,
  formatPnL,
  formatUSD,
} from "@/utils/sailDisplayFormat";

export type SailMarketPositionBarProps = {
  market: DefinedMarket;
  userDeposit?: bigint;
  currentValueUSD?: number;
  leveragedTokenPriceUSD?: number;
  isConnected: boolean;
  leverageRatio?: bigint;
  rebalanceThresholdLabel?: string;
};

const SAIL_POSITION_STAT_VALUE = SAIL_ADVANCED_HEADER_STRIP_VALUE;
const SAIL_POSITION_STAT_LABEL = SAIL_ADVANCED_HEADER_STRIP_LABEL;

function StatCell({
  label,
  value,
  valueClassName = SAIL_POSITION_STAT_VALUE,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center px-3 py-2.5 text-center">
      <span className={SAIL_POSITION_STAT_LABEL}>{label}</span>
      <span className={valueClassName} title={value}>
        {value}
      </span>
    </div>
  );
}

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
      ? `${SAIL_POSITION_STAT_VALUE} text-[#2d6b5c]`
      : `${SAIL_POSITION_STAT_VALUE} text-[#c45c4e]`;

  return {
    text: `${formatted.text}${pctText}`,
    valueClassName: colorClass,
  };
}

/** Per-market position value, PnL, and leverage facts — header row beside wallet stats. */
export function SailMarketPositionBar({
  market,
  userDeposit,
  currentValueUSD,
  leveragedTokenPriceUSD,
  isConnected,
  leverageRatio,
  rebalanceThresholdLabel,
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
    ? `grid w-full grid-cols-2 ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE} sm:grid-cols-4 sm:divide-y-0 ${className}`.trim()
    : `${SAIL_ADVANCED_HEADER_STRIP_SHELL} grid grid-cols-2 ${SAIL_ADVANCED_HEADER_STRIP_DIVIDE} sm:grid-cols-4 sm:divide-y-0 ${className}`.trim();

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

  return (
    <div className={shellClass} aria-label="Your position in this market">
      <StatCell label="Your position" value={positionValue} />
      <StatCell
        label="PnL"
        value={pnl.text}
        valueClassName={pnl.valueClassName}
      />
      <StatCell
        label="Rebalances at"
        value={rebalanceThresholdLabel ?? "—"}
      />
      <StatCell
        label="Current leverage"
        value={formatLeverage(leverageRatio)}
      />
    </div>
  );
}
