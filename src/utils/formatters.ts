import { formatEther as viemFormatEther } from "viem";

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

