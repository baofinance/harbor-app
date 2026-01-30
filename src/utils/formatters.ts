import { formatEther as viemFormatEther, formatUnits } from "viem";

/**
 * Format a number as USD currency with appropriate abbreviations
 * @param value - The USD value to format
 * @param options - Formatting options
 */
export function formatUSD(
  value: number,
  options: {
    compact?: boolean;
    minDecimals?: number;
    maxDecimals?: number;
  } = {}
): string {
  const { compact = true, minDecimals = 2, maxDecimals = 2 } = options;

  if (value === 0) return "$0";
  if (value < 0.01 && value > 0) return "<$0.01";

  if (compact) {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toLocaleString(undefined, {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
      })}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toLocaleString(undefined, {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
      })}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toLocaleString(undefined, {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
      })}K`;
    }
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })}`;
}

/**
 * Format a token amount from wei to human-readable string
 * @param value - The value in wei (bigint)
 * @param decimals - Token decimals (default 18)
 * @param maxFrac - Maximum fraction digits to display
 */
export function formatToken(
  value: bigint | undefined | null,
  decimals = 18,
  maxFrac = 4
): string {
  if (!value) return "0";
  const n = Number(value) / 10 ** decimals;
  if (n > 0 && n < 1 / 10 ** maxFrac) {
    return `<${(1 / 10 ** maxFrac).toFixed(maxFrac)}`;
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

/**
 * Format a bigint as ether with locale formatting
 * Re-exports viem's formatEther for convenience
 */
export { viemFormatEther as formatEther };

/**
 * Format a bigint as ether and return as a number
 */
export function formatEtherNumber(value: bigint | undefined | null): number {
  if (!value) return 0;
  return Number(viemFormatEther(value));
}

/**
 * Format a number with compact notation (K, M, B)
 */
export function formatCompact(
  value: number,
  options: { decimals?: number } = {}
): string {
  const { decimals = 2 } = options;

  if (value === 0) return "0";

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Format a number with locale and optional compact notation for large values.
 * @param value - Number or numeric string
 * @param maxDecimals - Max fraction digits (default 2)
 */
export function formatNumber(
  value: string | number,
  maxDecimals: number = 2
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1e6) {
    return num.toLocaleString(undefined, {
      maximumFractionDigits: maxDecimals,
      notation: "compact",
      compactDisplay: "short",
    });
  }
  return num.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  });
}

/**
 * Format 18-decimal token amounts for UI without rounding small balances to zero.
 * @param value - Amount in wei (18 decimals)
 * @param capDecimals - Optional cap on displayed decimals (e.g. 6 for "max 6 decimals")
 */
export function formatTokenAmount18(value: bigint, capDecimals?: number): string {
  if (value === 0n) return "0";
  const raw = formatUnits(value, 18);
  const abs = Math.abs(parseFloat(raw));
  let maxDecimals =
    abs >= 1 ? 4 : abs >= 0.01 ? 6 : abs >= 0.0001 ? 8 : 10;
  if (capDecimals !== undefined) maxDecimals = Math.min(maxDecimals, capDecimals);
  if (!raw.includes(".")) return raw;
  const [intPart, fracPart = ""] = raw.split(".");
  const slicedFrac = fracPart.slice(0, maxDecimals);
  const trimmed = slicedFrac.replace(/0+$/, "");
  const candidate = trimmed.length > 0 ? `${intPart}.${trimmed}` : intPart;
  if ((candidate === "0" || candidate === "-0") && value !== 0n) {
    return `<0.${"0".repeat(Math.max(0, maxDecimals - 1))}1`;
  }
  return candidate;
}

/**
 * Format 18-decimal USD-wei amounts (1e18 = $1.00) for UI.
 */
export function formatUsd18(usdWei: bigint): string {
  if (usdWei === 0n) return "$0";
  const raw = formatUnits(usdWei, 18);
  const abs = Math.abs(parseFloat(raw));
  if (abs > 0 && abs < 0.01) return "<$0.01";
  const maxDecimals = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return `$${formatNumber(raw, maxDecimals)}`;
}

/**
 * Scale Chainlink price feed answer to 18-decimal USD wei.
 * @param answer - Raw answer from Chainlink (decimals vary, often 8)
 * @param decimals - Feed decimals
 */
export function scaleChainlinkToUsdWei(answer: bigint, decimals: number): bigint {
  if (answer <= 0n) return 0n;
  if (decimals === 18) return answer;
  if (decimals < 18) return answer * 10n ** BigInt(18 - decimals);
  return answer / 10n ** BigInt(decimals - 18);
}

/**
 * Format a percentage value
 */
export function formatPercent(
  value: number,
  options: { decimals?: number; includeSign?: boolean } = {}
): string {
  const { decimals = 2, includeSign = false } = options;
  const formatted = value.toFixed(decimals);
  const sign = includeSign && value > 0 ? "+" : "";
  return `${sign}${formatted}%`;
}

/**
 * Format time remaining from a date string
 */
export function formatTimeRemaining(
  endDate: string,
  currentTime: Date = new Date()
): string {
  const end = new Date(endDate);
  const diffMs = end.getTime() - currentTime.getTime();

  if (diffMs <= 0) {
    return "Ended";
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;
  const diffMinutes = diffMs / (1000 * 60);

  if (diffDays >= 2) {
    return `ends in ${diffDays.toFixed(1)} days`;
  } else if (diffHours >= 2) {
    return `ends in ${diffHours.toFixed(1)} hours`;
  } else {
    return `ends in ${diffMinutes.toFixed(0)} minutes`;
  }
}

/**
 * Format a date/time string for display
 */
export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}

/**
 * Truncate an address for display
 */
export function truncateAddress(
  address: string | undefined,
  chars = 4
): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a token amount with symbol and optional USD value
 * @param amount - Amount in wei (bigint)
 * @param symbol - Token symbol
 * @param priceUSD - Optional USD price per token
 * @param maxDecimals - Maximum decimal places (default 6)
 * @param tokenDecimals - Token decimals (default 18, use 6 for USDC)
 * @returns Object with formatted amount and optional USD value
 */
export function formatTokenAmount(
  amount: bigint | undefined | null,
  symbol: string,
  priceUSD?: number,
  maxDecimals: number = 6,
  tokenDecimals: number = 18
): { formatted: string; usd: string | null; display: string } {
  if (!amount) {
    return {
      formatted: "0",
      usd: null,
      display: `0 ${symbol}`,
    };
  }

  const numValue = Number(formatUnits(amount, tokenDecimals));

  // Format with limited decimals, removing trailing zeros
  let formatted: string;
  if (numValue === 0) {
    formatted = "0";
  } else if (numValue < 0.000001) {
    formatted = numValue.toExponential(2);
  } else {
    // Use toLocaleString for thousand separators
    formatted = numValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
  }

  // Calculate USD value if price is available
  let usd: string | null = null;
  if (priceUSD && priceUSD > 0 && numValue > 0) {
    const usdValue = numValue * priceUSD;
    usd = formatUSD(usdValue);
  }

  // Display format with proper spacing: "1,234.56 ETH"
  const display = `${formatted} ${symbol}`;

  return { formatted, usd, display };
}

/**
 * Format a balance display with proper spacing
 * @param balance - Balance in wei
 * @param symbol - Token symbol
 * @param maxDecimals - Maximum decimal places
 * @param tokenDecimals - Token decimals (default 18, use 6 for USDC)
 * @returns Formatted string like "1,234.56 ETH"
 */
export function formatBalance(
  balance: bigint | undefined | null,
  symbol: string,
  maxDecimals: number = 4,
  tokenDecimals: number = 18
): string {
  if (!balance) return `0 ${symbol}`;

  const numValue = Number(formatUnits(balance, tokenDecimals));

  if (numValue === 0) return `0 ${symbol}`;

  if (numValue < 0.0001) {
    return `<0.0001 ${symbol}`;
  }

  const formatted = numValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });

  return `${formatted} ${symbol}`;
}
