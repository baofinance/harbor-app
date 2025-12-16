import { formatEther } from "viem";
import { useMemo } from "react";

export interface FormattedNumber {
  formatted: string;
  compact: string;
  raw: number | bigint;
}

export interface FormattedToken extends FormattedNumber {
  withSymbol: string;
  usd: string | null;
}

export interface FormattedUSD extends FormattedNumber {
  withSymbol: string;
}

/**
 * Comprehensive number formatting hook for consistent number display across the app
 */
export function useNumberFormatter() {
  return useMemo(
    () => ({
      /**
       * Format a token amount (bigint in wei) to human-readable string
       * @param value - Token amount in wei
       * @param symbol - Token symbol (e.g., "ETH", "USDC")
       * @param options - Formatting options
       * @returns Formatted token amount with symbol
       */
      formatToken: (
        value: bigint | undefined | null,
        symbol: string = "",
        options: {
          maxDecimals?: number;
          minDecimals?: number;
          showSymbol?: boolean;
          priceUSD?: number;
        } = {}
      ): FormattedToken => {
        const {
          maxDecimals = 6,
          minDecimals = 0,
          showSymbol = true,
          priceUSD,
        } = options;

        if (!value || value === 0n) {
          const formatted = "0";
          return {
            formatted,
            compact: formatted,
            withSymbol: showSymbol ? `${formatted} ${symbol}`.trim() : formatted,
            raw: 0n,
            usd: null,
          };
        }

        const numValue = Number(formatEther(value));

        // Format with limited decimals, removing trailing zeros
        let formatted: string;
        if (numValue < 0.000001) {
          formatted = numValue.toExponential(2);
        } else if (numValue < 1) {
          formatted = numValue.toFixed(maxDecimals).replace(/\.?0+$/, "");
        } else {
          // Add thousand separators for values >= 1
          formatted = numValue.toLocaleString(undefined, {
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
          });
        }

        // Compact format (K, M, B)
        let compact: string;
        if (numValue >= 1_000_000_000) {
          compact = `${(numValue / 1_000_000_000).toFixed(2)}B`;
        } else if (numValue >= 1_000_000) {
          compact = `${(numValue / 1_000_000).toFixed(2)}M`;
        } else if (numValue >= 10_000) {
          compact = `${(numValue / 1_000).toFixed(2)}K`;
        } else {
          compact = formatted;
        }

        // Calculate USD value if price is available
        let usd: string | null = null;
        if (priceUSD && priceUSD > 0) {
          const usdValue = numValue * priceUSD;
          if (usdValue < 0.01 && usdValue > 0) {
            usd = "<$0.01";
          } else if (usdValue < 1000) {
            usd = `$${usdValue.toFixed(2)}`;
          } else if (usdValue >= 1_000_000_000) {
            usd = `$${(usdValue / 1_000_000_000).toFixed(2)}B`;
          } else if (usdValue >= 1_000_000) {
            usd = `$${(usdValue / 1_000_000).toFixed(2)}M`;
          } else if (usdValue >= 1_000) {
            usd = `$${(usdValue / 1_000).toFixed(2)}K`;
          } else {
            usd = `$${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
          }
        }

        return {
          formatted,
          compact,
          withSymbol: showSymbol ? `${formatted} ${symbol}`.trim() : formatted,
          raw: value,
          usd,
        };
      },

      /**
       * Format a USD amount
       * @param value - USD amount as number
       * @param options - Formatting options
       * @returns Formatted USD amount
       */
      formatUSD: (
        value: number | undefined | null,
        options: {
          compact?: boolean;
          minDecimals?: number;
          maxDecimals?: number;
          showSymbol?: boolean;
        } = {}
      ): FormattedUSD => {
        const {
          compact = true,
          minDecimals = 2,
          maxDecimals = 2,
          showSymbol = true,
        } = options;

        if (!value || value === 0) {
          const formatted = "0";
          return {
            formatted,
            compact: formatted,
            withSymbol: showSymbol ? `$${formatted}` : formatted,
            raw: 0,
          };
        }

        if (value < 0.01 && value > 0) {
          const formatted = "<0.01";
          return {
            formatted,
            compact: formatted,
            withSymbol: showSymbol ? `$${formatted}` : formatted,
            raw: value,
          };
        }

        let formatted: string;
        let compactStr: string;

        if (compact) {
          if (value >= 1_000_000_000) {
            compactStr = `${(value / 1_000_000_000).toFixed(maxDecimals)}B`;
            formatted = compactStr;
          } else if (value >= 1_000_000) {
            compactStr = `${(value / 1_000_000).toFixed(maxDecimals)}M`;
            formatted = compactStr;
          } else if (value >= 10_000) {
            compactStr = `${(value / 1_000).toFixed(maxDecimals)}K`;
            formatted = compactStr;
          } else {
            formatted = value.toLocaleString(undefined, {
              minimumFractionDigits: minDecimals,
              maximumFractionDigits: maxDecimals,
            });
            compactStr = formatted;
          }
        } else {
          formatted = value.toLocaleString(undefined, {
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
          });
          compactStr = formatted;
        }

        return {
          formatted,
          compact: compactStr,
          withSymbol: showSymbol ? `$${formatted}` : formatted,
          raw: value,
        };
      },

      /**
       * Format a percentage
       * @param value - Percentage value (e.g., 0.05 for 5%, or 5 for 5%)
       * @param options - Formatting options
       * @returns Formatted percentage string
       */
      formatPercent: (
        value: number | undefined | null,
        options: {
          isDecimal?: boolean; // true if value is 0.05 for 5%, false if value is 5 for 5%
          maxDecimals?: number;
          minDecimals?: number;
          showSymbol?: boolean;
        } = {}
      ): string => {
        const {
          isDecimal = false,
          maxDecimals = 2,
          minDecimals = 0,
          showSymbol = true,
        } = options;

        if (!value || value === 0) return showSymbol ? "0%" : "0";

        const percentValue = isDecimal ? value * 100 : value;

        if (Math.abs(percentValue) < 0.01) {
          return showSymbol ? "<0.01%" : "<0.01";
        }

        const formatted = percentValue.toLocaleString(undefined, {
          minimumFractionDigits: minDecimals,
          maximumFractionDigits: maxDecimals,
        });

        return showSymbol ? `${formatted}%` : formatted;
      },

      /**
       * Format a ratio (e.g., collateral ratio from contract)
       * @param value - Ratio as bigint (scaled by 1e18)
       * @param options - Formatting options
       * @returns Formatted ratio string
       */
      formatRatio: (
        value: bigint | undefined | null,
        options: {
          maxDecimals?: number;
          minDecimals?: number;
          asPercent?: boolean; // true to show as %, false to show as decimal
        } = {}
      ): string => {
        const { maxDecimals = 2, minDecimals = 0, asPercent = true } = options;

        if (!value || value === 0n) return asPercent ? "0%" : "0";

        // Convert from 1e18 scale
        const numValue = Number(value) / 1e18;

        if (asPercent) {
          const percentValue = numValue * 100;
          return `${percentValue.toLocaleString(undefined, {
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
          })}%`;
        }

        return numValue.toLocaleString(undefined, {
          minimumFractionDigits: minDecimals,
          maximumFractionDigits: maxDecimals,
        });
      },

      /**
       * Format APR/APY
       * @param value - APR/APY as decimal (e.g., 0.05 for 5%)
       * @param options - Formatting options
       * @returns Formatted APR/APY string
       */
      formatAPR: (
        value: number | undefined | null,
        options: {
          maxDecimals?: number;
          showSymbol?: boolean;
          prefix?: string; // e.g., "up to ", "~"
        } = {}
      ): string => {
        const { maxDecimals = 2, showSymbol = true, prefix = "" } = options;

        if (!value || value === 0) return showSymbol ? "0%" : "0";
        if (!isFinite(value)) return "—";

        const percentValue = value * 100;

        if (Math.abs(percentValue) < 0.01) {
          return showSymbol ? `${prefix}<0.01%` : `${prefix}<0.01`;
        }

        const formatted = percentValue.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: maxDecimals,
        });

        return showSymbol ? `${prefix}${formatted}%` : `${prefix}${formatted}`;
      },
    }),
    []
  );
}

