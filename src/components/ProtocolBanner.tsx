"use client";

import React from "react";
import { getLogoPath } from "@/lib/logos";

export interface ProtocolBannerProps {
  /** Protocol name (e.g. "Sail", "Anchor") */
  protocolName: string;
  /** Token symbol (e.g. "haETH", "hsSTETH-EUR") */
  tokenSymbol: string;
  /** Optional icon URL. If not provided, falls back to getLogoPath(tokenSymbol) */
  tokenIcon?: string;
}

/**
 * Blue protocol banner used in Sail and Anchor modals.
 */
export function ProtocolBanner({
  protocolName,
  tokenSymbol,
  tokenIcon,
}: ProtocolBannerProps) {
  const iconSrc = tokenIcon ?? getLogoPath(tokenSymbol);

  return (
    <div className="bg-[#1E4775] text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
      <div className="text-sm sm:text-base font-semibold">{protocolName}</div>
      <div className="flex items-center gap-2">
        <img
          src={iconSrc}
          alt={tokenSymbol}
          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
        />
        <span className="text-sm sm:text-base font-semibold">
          {tokenSymbol}
        </span>
      </div>
    </div>
  );
}
