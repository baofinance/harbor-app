"use client";

import { memo } from "react";
import Image from "next/image";
import SimpleTooltip from "@/components/SimpleTooltip";
import { getLogoPath } from "@/components/shared";

export type GenesisMarketTokenStripProps = {
  underlyingSymbol: string;
  rowPeggedSymbol: string;
  rowLeveragedSymbol: string;
  /** `mobile`: hidden until md, includes leading ":". `desktop`: icons only, xl+; parent supplies ":" span. */
  variant: "mobile" | "desktop";
};

/**
 * Underlying = pegged + leveraged token logos (Harbor genesis row branding).
 */
export const GenesisMarketTokenStrip = memo(function GenesisMarketTokenStrip({
  underlyingSymbol,
  rowPeggedSymbol,
  rowLeveragedSymbol,
  variant,
}: GenesisMarketTokenStripProps) {
  const icons = (
    <>
      <SimpleTooltip label={underlyingSymbol}>
        <Image
          src={getLogoPath(underlyingSymbol)}
          alt={underlyingSymbol}
          width={20}
          height={20}
          className="flex-shrink-0 cursor-help"
        />
      </SimpleTooltip>
      <span className="text-[#1E4775]/60 text-xs">=</span>
      <SimpleTooltip label={rowPeggedSymbol}>
        <Image
          src={getLogoPath(rowPeggedSymbol)}
          alt={rowPeggedSymbol}
          width={20}
          height={20}
          className="flex-shrink-0 cursor-help"
        />
      </SimpleTooltip>
      <span className="text-[#1E4775]/60 text-xs">+</span>
      <SimpleTooltip label={rowLeveragedSymbol}>
        <Image
          src={getLogoPath(rowLeveragedSymbol)}
          alt={rowLeveragedSymbol}
          width={20}
          height={20}
          className="flex-shrink-0 cursor-help"
        />
      </SimpleTooltip>
    </>
  );

  if (variant === "mobile") {
    return (
      <div className="hidden md:flex items-center gap-0.5">
        <span className="text-[#1E4775]/60">:</span>
        {icons}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 hidden xl:flex">{icons}</div>
  );
});
