"use client";

import Image from "next/image";
import NetworkIconCell from "@/components/NetworkIconCell";
import { getLogoPath } from "@/components/shared";
import { formatUSD, formatToken } from "@/utils/formatters";

export function GenesisMarketChainCell({
  chainName,
  chainLogo,
  size,
}: {
  chainName: string;
  chainLogo: string;
  size: number;
}) {
  return (
    <div className="flex items-center justify-center">
      <NetworkIconCell chainName={chainName} chainLogo={chainLogo} size={size} />
    </div>
  );
}

import { GENESIS_VOYAGE_ROW_PILL_CLASS } from "./genesisActiveTableStyles";

const FEATURED_CHAIN_PILL_CLASS = GENESIS_VOYAGE_ROW_PILL_CLASS;

/**
 * Featured voyage header (dark glass): icon + chain name in a white pill (Ethereum & MegaETH).
 */
export function FeaturedVoyageChainMark({
  chainName,
  chainLogo = "icons/eth.png",
  iconSize = 20,
}: {
  chainName: string;
  chainLogo?: string;
  iconSize?: number;
}) {
  return (
    <span className={FEATURED_CHAIN_PILL_CLASS}>
      <NetworkIconCell chainName={chainName} chainLogo={chainLogo} size={iconSize} />
      <span className="text-sm font-semibold leading-none tracking-tight">
        {chainName}
      </span>
    </span>
  );
}

/** Collateral = pegged + leveraged logos; shared by completed rows and similar compact layouts. */
export function GenesisMarketCollateralEquationStrip({
  collateralSymbol,
  peggedSymbol,
  leveragedSymbol,
  iconSize = 20,
}: {
  collateralSymbol: string;
  peggedSymbol: string;
  leveragedSymbol: string;
  iconSize?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <Image
        src={getLogoPath(collateralSymbol)}
        alt={collateralSymbol}
        width={iconSize}
        height={iconSize}
        className="flex-shrink-0 rounded-full"
      />
      <span className="text-[#1E4775]/60 text-xs">=</span>
      <Image
        src={getLogoPath(peggedSymbol)}
        alt={peggedSymbol}
        width={iconSize}
        height={iconSize}
        className="flex-shrink-0 rounded-full"
      />
      <span className="text-[#1E4775]/60 text-xs">+</span>
      <Image
        src={getLogoPath(leveragedSymbol)}
        alt={leveragedSymbol}
        width={iconSize}
        height={iconSize}
        className="flex-shrink-0 rounded-full"
      />
    </div>
  );
}

/** Formatted user deposit for table cells (USD when price known, else token + symbol). */
export function GenesisYourDepositAmountText({
  userDeposit,
  collateralPriceUSD,
  collateralSymbol,
  userDepositUSD,
  className = "text-[#1E4775] font-semibold text-xs",
}: {
  userDeposit: bigint | undefined;
  collateralPriceUSD: number;
  collateralSymbol: string;
  userDepositUSD: number;
  className?: string;
}) {
  const text =
    userDeposit && userDeposit > 0n
      ? collateralPriceUSD > 0
        ? formatUSD(userDepositUSD)
        : `${formatToken(userDeposit)} ${collateralSymbol}`
      : "$0";
  return <div className={className}>{text}</div>;
}
