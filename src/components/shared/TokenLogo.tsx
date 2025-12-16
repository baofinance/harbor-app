"use client";

import React from "react";
import Image from "next/image";

/**
 * Get the logo path for a token symbol
 */
export function getLogoPath(symbol: string): string {
  const normalizedSymbol = symbol.toLowerCase();

  // Common tokens
  if (normalizedSymbol === "eth" || normalizedSymbol === "ethereum") {
    return "/icons/eth.png";
  }
  if (normalizedSymbol === "fxsave") {
    return "/icons/fxSave.png";
  }
  if (normalizedSymbol === "fxusd") {
    return "/icons/fxUSD.webp";
  }
  if (normalizedSymbol === "usdc") {
    return "/icons/usdc.webp";
  }
  if (normalizedSymbol === "steth") {
    return "/icons/steth_logo.webp";
  }
  if (normalizedSymbol === "wsteth") {
    return "/icons/wstETH.webp";
  }
  if (normalizedSymbol === "susde") {
    return "/icons/susde.svg";
  }
  if (normalizedSymbol === "btc" || normalizedSymbol === "bitcoin") {
    return "/icons/btc.png";
  }
  if (normalizedSymbol === "wbtc") {
    return "/icons/btc.png"; // Use BTC icon for WBTC
  }
  if (
    normalizedSymbol === "awbtc" ||
    normalizedSymbol === "abtc" ||
    normalizedSymbol === "aethwbtc"
  ) {
    return "/icons/btc.png"; // Use BTC icon for Aave WBTC variants
  }

  // Harbor tokens - ha (pegged) tokens
  if (normalizedSymbol === "haeth") {
    return "/icons/haETH.png";
  }
  if (normalizedSymbol === "habtc") {
    return "/icons/haBTC.png";
  }
  if (normalizedSymbol === "hapb") {
    return "/icons/haETH.png";
  }
  if (normalizedSymbol.startsWith("ha")) {
    return "/icons/haUSD2.png"; // Fallback for other ha tokens
  }
  
  // Harbor tokens - hs (leveraged) tokens
  if (normalizedSymbol === "hsfxusd-eth" || normalizedSymbol === "hsfxusdeth") {
    return "/icons/hsUSDETH.png";
  }
  if (normalizedSymbol === "hsfxusd-btc" || normalizedSymbol === "hsfxusdbtc") {
    return "/icons/hsUSDBTC.png";
  }
  if (normalizedSymbol === "hssteth-btc" || normalizedSymbol === "hsstethbtc") {
    return "/icons/hsETHBTC.png";
  }
  if (normalizedSymbol.startsWith("hs")) {
    return "/icons/hsUSDETH.png"; // Fallback for other hs tokens
  }

  return "/icons/placeholder.svg";
}

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
