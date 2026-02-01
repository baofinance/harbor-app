"use client";

import React from "react";
import Image from "next/image";
import { getLogoPath as getLogoPathFromLib } from "@/lib/logos";

/** Re-export centralized logo path helper */
export const getLogoPath = getLogoPathFromLib;

interface TokenLogoProps {
  symbol: string;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Reusable token logo component
 */
export function TokenLogo({
  symbol,
  size = 24,
  className = "",
  alt,
}: TokenLogoProps) {
  const logoPath = getLogoPath(symbol);

  return (
    <Image
      src={logoPath}
      alt={alt || symbol}
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
    />
  );
}

export default TokenLogo;
