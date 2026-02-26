/**
 * useAmountInput
 *
 * Shared hook for amount input change/max/validation logic across deposit/mint/redeem modals.
 * Handles decimal validation, optional balance capping, and MAX button formatting.
 */

import { useCallback, useMemo } from "react";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";

export interface UseAmountInputOptions {
  /** Token decimals (6 for USDC, 18 for most others) */
  decimals: number;
  /** User's balance in smallest units (wei/satoshi) */
  balance: bigint | undefined;
  /** When true, typing a value above balance auto-caps to balance */
  capAtBalance?: boolean;
  /** When true, use parseEther/formatEther instead of parseUnits/formatUnits */
  isNativeETH?: boolean;
  /** Called when user input clears any error (e.g. setError(null)) */
  onErrorClear?: () => void;
}

export interface UseAmountInputResult {
  /** Handler for input onChange - validates decimals, optionally caps at balance */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for MAX button - sets value to formatted balance */
  handleMax: () => void;
  /** True when current parsed value exceeds balance (for error styling) */
  exceedsBalance: boolean;
  /** Parsed value in smallest units, or undefined if invalid/empty */
  parsedValue: bigint | undefined;
}

const DECIMAL_REGEX = /^\d*\.?\d*$/;

export function useAmountInput(
  value: string,
  setValue: (v: string) => void,
  options: UseAmountInputOptions
): UseAmountInputResult {
  const {
    decimals,
    balance,
    capAtBalance = true,
    isNativeETH = false,
    onErrorClear,
  } = options;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "" || DECIMAL_REGEX.test(raw)) {
        if (capAtBalance && raw && balance !== undefined && balance !== null) {
          try {
            const parsed = isNativeETH
              ? parseEther(raw)
              : parseUnits(raw, decimals);
            if (parsed > balance) {
              const formatted = isNativeETH
                ? formatEther(balance)
                : formatUnits(balance, decimals);
              setValue(formatted);
              onErrorClear?.();
              return;
            }
          } catch {
            // Allow partial input (e.g. trailing decimal)
          }
        }
        setValue(raw);
        onErrorClear?.();
      }
    },
    [balance, capAtBalance, decimals, isNativeETH, onErrorClear, setValue]
  );

  const handleMax = useCallback(() => {
    if (balance !== undefined && balance !== null) {
      const formatted = isNativeETH
        ? formatEther(balance)
        : formatUnits(balance, decimals);
      setValue(formatted);
      onErrorClear?.();
    }
  }, [balance, decimals, isNativeETH, onErrorClear, setValue]);

  const parsedValue = useMemo(() => {
    if (!value || parseFloat(value) <= 0) return undefined;
    try {
      return isNativeETH ? parseEther(value) : parseUnits(value, decimals);
    } catch {
      return undefined;
    }
  }, [value, decimals, isNativeETH]);

  const exceedsBalance = useMemo(() => {
    if (!parsedValue || !balance) return false;
    return parsedValue > balance;
  }, [parsedValue, balance]);

  return { handleChange, handleMax, exceedsBalance, parsedValue };
}
