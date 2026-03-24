"use client";

import React from "react";
import { getLogoPath } from "@/lib/logos";

export interface ProtocolBannerProps {
  /** Protocol name (e.g. "Sail", "Anchor") */
  protocolName: string;
  /** Primary token symbol (e.g. haETH, haBTC) */
  tokenSymbol: string;
  /** Optional icon URL. If not provided, falls back to getLogoPath(tokenSymbol) */
  tokenIcon?: string;
  /**
   * Optional leveraged / Sail token (e.g. hsFXUSD-ETH) — shown after primary as "ha + hs".
   * Used on Genesis modal alongside pegged token.
   */
  secondaryTokenSymbol?: string;
  secondaryTokenIcon?: string;
}

function TokenBadge({
  symbol,
  iconSrc,
}: {
  symbol: string;
  iconSrc: string;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
      <img
        src={iconSrc}
        alt={symbol}
        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0 bg-white/10"
      />
      <span className="text-xs sm:text-sm font-semibold truncate max-w-[9rem] sm:max-w-[12rem]">
        {symbol}
      </span>
    </div>
  );
}

/**
 * Blue protocol banner used in Sail, Anchor, and Genesis modals.
 */
export function ProtocolBanner({
  protocolName,
  tokenSymbol,
  tokenIcon,
  secondaryTokenSymbol,
  secondaryTokenIcon,
}: ProtocolBannerProps) {
  const primaryIcon = tokenIcon ?? getLogoPath(tokenSymbol);
  const showPair =
    secondaryTokenSymbol &&
    secondaryTokenSymbol.trim() !== "" &&
    secondaryTokenSymbol !== tokenSymbol;
  const secondaryIcon =
    secondaryTokenIcon ?? getLogoPath(secondaryTokenSymbol ?? "");

  return (
    <div className="bg-[#1E4775] text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 rounded-t-md min-h-[2.75rem]">
      <div className="text-sm sm:text-base font-semibold shrink-0">
        {protocolName}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end">
        <TokenBadge symbol={tokenSymbol} iconSrc={primaryIcon} />
        {showPair && (
          <>
            <span
              className="text-white/70 font-semibold text-xs sm:text-sm shrink-0"
              aria-hidden
            >
              +
            </span>
            <TokenBadge symbol={secondaryTokenSymbol} iconSrc={secondaryIcon} />
          </>
        )}
      </div>
    </div>
  );
}
