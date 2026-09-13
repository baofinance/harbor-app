"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatEther } from "viem";
import type { useAnyTokenDeposit } from "@/hooks/useAnyTokenDeposit";
import type { AnchorModalMarket } from "./modalHookTypes";
import type { AnchorDepositWithdrawTab } from "./types";

export type UseDepositAmountCapParams = {
  activeTab: AnchorDepositWithdrawTab;
  amount: string;
  setAmount: (value: string) => void;
  selectedDepositAsset: string;
  isDirectPeggedDeposit: boolean;
  collateralSymbol: string;
  activeCollateralSymbol: string;
  activeWrappedCollateralSymbol: string;
  marketForDepositAsset: AnchorModalMarket;
  selectedMarket: AnchorModalMarket;
  /** Mint dry run for the parsed input; `result[2]` is what the minter will actually take. */
  dryRunData: unknown;
  parsedAmount: bigint | undefined;
  swapDryRunOutput: unknown;
  swappedAmountForDryRun: bigint | undefined;
  anyTokenDeposit: ReturnType<typeof useAnyTokenDeposit>;
};

/**
 * Keeps the deposit input inside what the minter will actually accept.
 *
 * Watches both the swap and direct-deposit dry runs, clamps the amount down when the
 * collateral ratio limits the mint, and owns the persistent (`depositLimitWarning`) plus
 * transient near-the-Max-button (`tempMaxWarning`) messages. Also exposes
 * `maxMintableDepositAmountRef` so the MAX button can cap without re-rendering.
 */
export function useDepositAmountCap({
  activeTab,
  amount,
  setAmount,
  selectedDepositAsset,
  isDirectPeggedDeposit,
  collateralSymbol,
  activeCollateralSymbol,
  activeWrappedCollateralSymbol,
  marketForDepositAsset,
  selectedMarket,
  dryRunData,
  parsedAmount,
  swapDryRunOutput,
  swappedAmountForDryRun,
  anyTokenDeposit,
}: UseDepositAmountCapParams) {
  // Auto-adjust amount when minter refuses full deposit
  const [depositLimitWarning, setDepositLimitWarning] = useState<string | null>(null);
  const [tempMaxWarning, setTempMaxWarning] = useState<string | null>(null);
  const tempWarningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAdjustedAmountRef = useRef<string | null>(null);
  /** Latest market max mintable in deposit-asset units (for MAX button capping). */
  const maxMintableDepositAmountRef = useRef<number | undefined>(undefined);

  // Helper function to calculate max acceptable amount for swap deposits
  const calculateMaxSwapAmount = useMemo(() => {
    // Skip for direct deposits (wstETH, fxSAVE) that don't need swaps
    const isWrappedCollateralDeposit = selectedDepositAsset?.toLowerCase() === "wsteth" || 
                                        selectedDepositAsset?.toLowerCase() === "fxsave";
    if (!anyTokenDeposit.needsSwap || !swapDryRunOutput || !swappedAmountForDryRun || !anyTokenDeposit.swapQuote || isWrappedCollateralDeposit) {
      return null;
    }

    const dryRunResult = swapDryRunOutput as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
    if (!dryRunResult || dryRunResult.length < 3) return null;

    const wrappedCollateralTaken = dryRunResult[2];
    const takenRatio = Number(wrappedCollateralTaken) / Number(swappedAmountForDryRun);

    // If minter is taking less than 99.5% of swap output, there's a limit
    if (takenRatio >= 0.995 || wrappedCollateralTaken === 0n) {
      return null;
    }

    // Work backwards: wrappedCollateral → intermediate token (USDC/ETH) → input token
    const isFxSAVEMarket = activeWrappedCollateralSymbol === "fxSAVE";
    const isWstETHMarket = activeWrappedCollateralSymbol === "wstETH";
    let maxIntermediateAmount: bigint;
    const isSwappingToUSDC = anyTokenDeposit.swapTargetToken !== "ETH";
    
    if (isSwappingToUSDC && isFxSAVEMarket) {
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      const fxUsdAmount = (wrappedCollateralTaken * wrappedRate) / 10n**18n;
      maxIntermediateAmount = fxUsdAmount / 10n**12n;
    } else if (!isSwappingToUSDC && isWstETHMarket) {
      const wrappedRate = marketForDepositAsset?.wrappedRate || selectedMarket?.wrappedRate || 10n**18n;
      const stEthAmount = (wrappedCollateralTaken * wrappedRate) / 10n**18n;
      maxIntermediateAmount = stEthAmount;
    } else {
      return null;
    }
    
    const swapFromAmount = BigInt(anyTokenDeposit.swapQuote.fromAmount);
    const swapToAmount = BigInt(anyTokenDeposit.swapQuote.toAmount);
    const maxInputAmount = (swapFromAmount * maxIntermediateAmount) / swapToAmount;
    const formattedMax = (Number(maxInputAmount) / (10 ** anyTokenDeposit.tokenDecimals)).toString();
    
    return formattedMax;
  }, [
    anyTokenDeposit.needsSwap,
    anyTokenDeposit.swapQuote,
    anyTokenDeposit.swapTargetToken,
    anyTokenDeposit.tokenDecimals,
    swapDryRunOutput,
    swappedAmountForDryRun,
    activeWrappedCollateralSymbol,
    marketForDepositAsset,
    selectedMarket,
    selectedDepositAsset,
  ]);

  // Check swap dry run for max acceptable amount and auto-adjust
  // Skip this entirely for direct deposits (wstETH, fxSAVE) that don't need swaps
  useEffect(() => {
    // Skip if not a swap deposit, or if it's a wrapped collateral (direct deposit, no swap needed)
    const isWrappedCollateralDeposit = selectedDepositAsset?.toLowerCase() === "wsteth" || 
                                        selectedDepositAsset?.toLowerCase() === "fxsave";
    if (!anyTokenDeposit.needsSwap || activeTab !== "deposit" || isWrappedCollateralDeposit) {
      setDepositLimitWarning(null);
      lastAdjustedAmountRef.current = null; // Reset tracking when not applicable
      return;
    }

    // If calculateMaxSwapAmount is not available yet, preserve existing warning
    // This prevents the warning from disappearing during recalculation
    if (!calculateMaxSwapAmount) {
      // Only clear warning if amount is 0 or empty - otherwise preserve it during recalculation
      if (!amount || parseFloat(amount) === 0) {
        setDepositLimitWarning(null);
        return;
      }
      // If we have an amount but no calculateMaxSwapAmount yet, preserve the warning
      // and wait for calculateMaxSwapAmount to become available
      // This ensures the warning doesn't disappear during recalculation
      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] calculateMaxSwapAmount not available yet, preserving warning for amount:", amount);
      }
      return;
    }

    const currentInputAmount = parseFloat(amount || "0");
    const maxInputAmountFloat = parseFloat(calculateMaxSwapAmount);
    const difference = currentInputAmount - maxInputAmountFloat;

    if (process.env.NODE_ENV === "development") {
      console.log("[Swap Dry Run Check]", {
        currentAmount: amount,
        maxAmount: calculateMaxSwapAmount,
        currentInputAmount,
        maxInputAmountFloat,
        difference,
        exceedsMax: currentInputAmount > maxInputAmountFloat,
        willAutoAdjust: currentInputAmount > maxInputAmountFloat,
      });
    }

    // Tolerance for comparing amounts (accounts for floating point precision)
    // Use a small tolerance only for "at max" detection, but adjust immediately if above max
    const tolerance = 0.0001; // Small tolerance for "at max" detection
    // Consider "at max" if within tolerance (either slightly above or at the max)
    // This ensures the warning persists even if calculateMaxSwapAmount is recalculated
    const isAtMax = Math.abs(difference) <= tolerance || currentInputAmount <= maxInputAmountFloat + tolerance;
    // If amount is greater than max (even slightly), always adjust it down
    // Use a very small threshold to account for floating point precision, but be aggressive about adjusting
    const exceedsMax = difference > 0.00001; // Adjust if more than 0.00001 above max

    if (process.env.NODE_ENV === "development") {
      console.log("[Swap Dry Run Check] Comparison:", {
        currentInputAmount,
        maxInputAmountFloat,
        difference,
        isAtMax,
        exceedsMax,
        willAdjust: exceedsMax,
      });
    }

    // If amount exceeds the max, always adjust it down
    // But only if we haven't already adjusted to this value (prevent infinite loops)
    if (exceedsMax) {
      const adjustedAmount = calculateMaxSwapAmount;
      
      // Prevent infinite loop: don't adjust if we've already adjusted to this value
      if (lastAdjustedAmountRef.current === adjustedAmount) {
        if (process.env.NODE_ENV === "development") {
          console.log("[Swap Dry Run] Skipping adjustment - already adjusted to this value:", adjustedAmount);
        }
        return;
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Adjusting amount from", currentInputAmount, "to", calculateMaxSwapAmount, "difference:", difference);
      }
      // Always adjust - use the calculated max
      setAmount(adjustedAmount);
      anyTokenDeposit.setAmount(adjustedAmount); // Sync with hook
      lastAdjustedAmountRef.current = adjustedAmount; // Track the adjusted amount
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Amount adjusted successfully to:", adjustedAmount);
      }
      
      // Show warning message
      const warningMessage = `Maximum deposit limited to ${calculateMaxSwapAmount} ${selectedDepositAsset || ""} (after swap) to maintain collateral ratio.`;
      setDepositLimitWarning(warningMessage);

      // Set temporary warning near Max button
      const warningText = `Max: ${parseFloat(calculateMaxSwapAmount).toFixed(4)} ${selectedDepositAsset || ""}`;
      setTempMaxWarning(warningText);

      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Setting warning:", {
          warningMessage,
          warningText,
        });
      }

      // Clear any existing timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
      }

      // Set new timer to clear temp warning after 5 seconds (keep depositLimitWarning visible)
      tempWarningTimerRef.current = setTimeout(() => {
        setTempMaxWarning(null);
        tempWarningTimerRef.current = null;
      }, 5000);
    } else if (isAtMax) {
      // Amount is at the max - show warning but don't adjust

      // Show warning message
      const warningMessage = `Maximum deposit limited to ${calculateMaxSwapAmount} ${selectedDepositAsset || ""} (after swap) to maintain collateral ratio.`;
      setDepositLimitWarning(warningMessage);

      // Set temporary warning near Max button
      const warningText = `Max: ${parseFloat(calculateMaxSwapAmount).toFixed(4)} ${selectedDepositAsset || ""}`;
      setTempMaxWarning(warningText);

      if (process.env.NODE_ENV === "development") {
        console.log("[Swap Dry Run] Setting warning:", {
          warningMessage,
          warningText,
          isAtMax,
          exceedsMax,
        });
      }

      // Clear any existing timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
      }

      // Set new timer to clear temp warning after 5 seconds (keep depositLimitWarning visible)
      tempWarningTimerRef.current = setTimeout(() => {
        setTempMaxWarning(null);
        tempWarningTimerRef.current = null;
      }, 5000);
    } else {
      // Input is below the max, clear warnings and reset adjustment tracking
      // Only clear if the amount is significantly below the max (not just slightly)
      // Use a larger threshold (1% of max) to ensure warnings persist when near the max
      // This prevents the warning from disappearing when calculateMaxSwapAmount is recalculated
      const clearThreshold = Math.max(0.001, maxInputAmountFloat * 0.01); // At least 0.001 or 1% of max
      const significantDifference = currentInputAmount < maxInputAmountFloat - clearThreshold;
      if (significantDifference) {
        // Reset adjustment tracking when amount is significantly below max
        // This allows re-adjustment if user increases amount again
        lastAdjustedAmountRef.current = null;
        if (process.env.NODE_ENV === "development") {
          console.log("[Swap Dry Run] Clearing warning - amount significantly below max:", {
            currentInputAmount,
            maxInputAmountFloat,
            difference: currentInputAmount - maxInputAmountFloat,
            clearThreshold,
          });
        }
        setDepositLimitWarning(null);
        if (tempWarningTimerRef.current) {
          clearTimeout(tempWarningTimerRef.current);
          tempWarningTimerRef.current = null;
        }
        setTempMaxWarning(null);
      } else {
        // Amount is very close to max but not quite at it - keep warning visible
        // This ensures the warning doesn't flicker when the amount is near the max
        // or when calculateMaxSwapAmount is recalculated
        if (process.env.NODE_ENV === "development") {
          console.log("[Swap Dry Run] Keeping warning - amount very close to max:", {
            currentInputAmount,
            maxInputAmountFloat,
            difference: currentInputAmount - maxInputAmountFloat,
            clearThreshold,
          });
        }
        // Always set the warning if we're near the max - don't check if it already exists
        // This ensures it persists even if calculateMaxSwapAmount changes slightly
        const warningMessage = `Maximum deposit limited to ${calculateMaxSwapAmount} ${selectedDepositAsset || ""} (after swap) to maintain collateral ratio.`;
        setDepositLimitWarning(warningMessage);
        
        // Also set temporary warning if not already set
        if (!tempMaxWarning) {
          const warningText = `Max: ${parseFloat(calculateMaxSwapAmount).toFixed(4)} ${selectedDepositAsset || ""}`;
          setTempMaxWarning(warningText);
          
          // Clear any existing timer
          if (tempWarningTimerRef.current) {
            clearTimeout(tempWarningTimerRef.current);
          }
          
          // Set new timer to clear temp warning after 5 seconds (keep depositLimitWarning visible)
          tempWarningTimerRef.current = setTimeout(() => {
            setTempMaxWarning(null);
            tempWarningTimerRef.current = null;
          }, 5000);
        }
      }
    }
  }, [
    anyTokenDeposit.needsSwap,
    calculateMaxSwapAmount,
    amount,
    selectedDepositAsset,
    activeTab,
    anyTokenDeposit.setAmount,
  ]);

  // Reset adjustment tracking when deposit asset changes
  useEffect(() => {
    lastAdjustedAmountRef.current = null;
  }, [selectedDepositAsset]);

  // Check direct deposit dry run for max acceptable amount
  useEffect(() => {
    // For swap deposits, this useEffect should not run - handled by swap dry run useEffect
    if (anyTokenDeposit.needsSwap) {
      return; // Don't clear warning - it's managed by the swap dry run useEffect
    }
    
    // Skip auto-adjustment for wrapped collateral deposits (wstETH, fxSAVE) - they should go directly to minter
    // The dry run might show limits, but we shouldn't auto-adjust for these direct deposits
    const isWrappedCollateralDeposit = selectedDepositAsset?.toLowerCase() === "wsteth" || 
                                        selectedDepositAsset?.toLowerCase() === "fxsave";
    if (isWrappedCollateralDeposit) {
      setDepositLimitWarning(null);
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
      setTempMaxWarning(null);
      lastAdjustedAmountRef.current = null;
      return;
    }
    
    if (isDirectPeggedDeposit || !dryRunData || !parsedAmount || activeTab !== "deposit") {
      setDepositLimitWarning(null);
      // Clear any pending timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
      setTempMaxWarning(null);
      return;
    }

    const dryRunResult = dryRunData as
      | [bigint, bigint, bigint, bigint, bigint, bigint]
      | undefined;
    
    if (!dryRunResult || dryRunResult.length < 3) {
      setDepositLimitWarning(null);
      // Clear any pending timer
      if (tempWarningTimerRef.current) {
        clearTimeout(tempWarningTimerRef.current);
        tempWarningTimerRef.current = null;
      }
      setTempMaxWarning(null);
      return;
    }

    // result[2] = wrappedCollateralTaken (actual amount minter will accept in fxSAVE)
    const wrappedCollateralTaken = dryRunResult[2];
    const takenRatio = Number(wrappedCollateralTaken) / Number(parsedAmount);

    // If minter is taking less than 99.5% of input, there's a limit
    if (takenRatio < 0.995 && wrappedCollateralTaken > 0n) {
      // Convert back to user's selected asset for display
      const wrappedCollateralSymbol = marketForDepositAsset?.collateral?.symbol || "";
      const underlyingCollateralSymbol = marketForDepositAsset?.collateral?.underlyingSymbol || "";
      const wrappedRate = marketForDepositAsset?.wrappedRate;
      
      let maxAcceptableInUserAsset: number;
      
      if (selectedDepositAsset?.toLowerCase() === wrappedCollateralSymbol.toLowerCase()) {
        // User selected fxSAVE - use amount directly
        maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
      } else if (selectedDepositAsset?.toLowerCase() === underlyingCollateralSymbol.toLowerCase()) {
        // User selected fxUSD - convert fxSAVE back to fxUSD
        // fxUSD = fxSAVE * rate
        if (wrappedRate && wrappedRate > 0n) {
          const amountInUnderlying = (wrappedCollateralTaken * wrappedRate) / BigInt(1e18);
          maxAcceptableInUserAsset = Number(formatEther(amountInUnderlying));
        } else {
          // Fallback: 1:1
          maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
        }
      } else {
        // For ETH/stETH deposits: convert wstETH back to ETH/stETH using wrapped rate
        // wrappedCollateralTaken is in wstETH, we need to convert back to ETH/stETH
        const isWstETHMarket = activeWrappedCollateralSymbol === "wstETH";
        if (isWstETHMarket && (selectedDepositAsset === "ETH" || selectedDepositAsset === collateralSymbol || selectedDepositAsset === "stETH")) {
          // wstETH → stETH → ETH (stETH and ETH are 1:1)
          // stETH = wstETH * wrappedRate / 1e18
          if (wrappedRate && wrappedRate > 0n) {
            const stEthAmount = (wrappedCollateralTaken * wrappedRate) / 10n**18n;
            maxAcceptableInUserAsset = Number(formatEther(stEthAmount));
          } else {
            // Fallback: assume 1:1 (shouldn't happen, but safe fallback)
        maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
          }
        } else {
          // For USDC, fxUSD, etc. - use wrapped amount directly
          maxAcceptableInUserAsset = Number(formatEther(wrappedCollateralTaken));
        }
      }
      
      const formattedMax = maxAcceptableInUserAsset.toFixed(4);
      const currentInputAmount = parseFloat(amount || "0");
      const maxInputAmountFloat = parseFloat(formattedMax);
      
      // Only auto-adjust if user's input EXCEEDS the max
      // But prevent infinite loops by checking if we've already adjusted to this value
      if (currentInputAmount > maxInputAmountFloat) {
        // Prevent infinite loop: don't adjust if we've already adjusted to this value
        if (lastAdjustedAmountRef.current === formattedMax) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Direct Deposit Dry Run] Skipping adjustment - already adjusted to this value:", formattedMax);
          }
          return;
        }
        
        setAmount(formattedMax);
        lastAdjustedAmountRef.current = formattedMax; // Track the adjusted amount
        setDepositLimitWarning(
          `Maximum deposit limited to ${formattedMax} ${selectedDepositAsset || activeCollateralSymbol} to maintain collateral ratio.`
        );
        
        // Set temporary warning near Max button
        const warningText = `Max: ${formattedMax} ${selectedDepositAsset || activeCollateralSymbol}`;
        setTempMaxWarning(warningText);
        
        // Clear any existing timer
        if (tempWarningTimerRef.current) {
          clearTimeout(tempWarningTimerRef.current);
        }
        
        // Set new timer to clear warning after 3 seconds
        tempWarningTimerRef.current = setTimeout(() => {
          setTempMaxWarning(null);
          tempWarningTimerRef.current = null;
        }, 3000);
      } else {
        // Input is within limits, just clear any previous warning
        // Reset adjustment tracking when amount is within limits
        lastAdjustedAmountRef.current = null;
        setDepositLimitWarning(null);
      }
    } else {
      // No limit detected, clear warnings if no temp warning is active
      if (!tempMaxWarning) {
        setDepositLimitWarning(null);
      }
    }
  }, [
    dryRunData,
    parsedAmount,
    isDirectPeggedDeposit,
    activeTab,
    selectedDepositAsset,
    activeCollateralSymbol,
    marketForDepositAsset,
    tempMaxWarning,
  ]);

  return {
    depositLimitWarning,
    setDepositLimitWarning,
    tempMaxWarning,
    setTempMaxWarning,
    tempWarningTimerRef,
    lastAdjustedAmountRef,
    maxMintableDepositAmountRef,
    calculateMaxSwapAmount,
  };
}
