"use client";

import { useMemo } from "react";
import { parseEther } from "viem";
import { useContractRead } from "wagmi";
import { MINTER_PEGGED_ABI } from "@/abis";
import type { useAnyTokenDeposit } from "@/hooks/useAnyTokenDeposit";
import {
  parseMintDryRunResult,
  resolveMintValidation,
} from "@/utils/anchorMintValidation";
import type { AnchorModalMarket } from "./modalHookTypes";
import type { AnchorDepositWithdrawTab } from "./types";

export type UseMintDryRunAndValidationParams = {
  /** Minter used for the mint dry run (deposit-asset market in simple mode). */
  feeMinterAddress: string | undefined;
  isValidFeeMinterAddress: boolean;
  isActive: boolean;
  activeTab: AnchorDepositWithdrawTab;
  isDirectPeggedDeposit: boolean;
  /** `true` routes reads through the local-dev (Anvil) variant. */
  shouldUseAnvilHook: boolean;
  amount: string;
  debouncedAmount: string;
  selectedDepositAsset: string;
  marketForDepositAsset: AnchorModalMarket;
  selectedMarket: AnchorModalMarket;
  activeMarketForFees: AnchorModalMarket;
  market: AnchorModalMarket;
  activeCollateralSymbol: string;
  btcPrice: number | undefined;
  ethPrice: number | undefined;
  /** Accurate wrapped amount for ETH/stETH legs, read from the wstETH contract. */
  wstETHAmountFromContract: unknown;
  /** Output of `calculateMintPeggedTokenOutput`, preferred over the dry run when present. */
  rawExpectedMintOutput: bigint | undefined;
  anyTokenDeposit: ReturnType<typeof useAnyTokenDeposit>;
  swappedAmountForDryRun: bigint | undefined;
  swapDryRunOutput: unknown;
  swapDryRunError: unknown;
  swapDryRunFetching: boolean;
};

/**
 * Mint-side amount parsing, `mintPeggedTokenDryRun` reads and everything derived from
 * them: expected output, fee percentage and the `mintValidation` gate that drives CTA
 * labels and submit blocking.
 */
export function useMintDryRunAndValidation({
  feeMinterAddress,
  isValidFeeMinterAddress,
  isActive,
  activeTab,
  isDirectPeggedDeposit,
  shouldUseAnvilHook,
  amount,
  debouncedAmount,
  selectedDepositAsset,
  marketForDepositAsset,
  selectedMarket,
  activeMarketForFees,
  market,
  activeCollateralSymbol,
  btcPrice,
  ethPrice,
  wstETHAmountFromContract,
  rawExpectedMintOutput,
  anyTokenDeposit,
  swappedAmountForDryRun,
  swapDryRunOutput,
  swapDryRunError,
  swapDryRunFetching,
}: UseMintDryRunAndValidationParams) {
  // Parse amount to BigInt, converting to wrapped collateral (fxSAVE) if needed
  // Use debounced amount to reduce unnecessary contract calls
  const parsedAmount = useMemo(() => {
    if (!debouncedAmount || parseFloat(debouncedAmount) <= 0) return undefined;

    // Skip dry run for very small amounts (< 0.0001) to reduce calls
    if (parseFloat(debouncedAmount) < 0.0001) return undefined;

    try {
      const inputAmount = parseEther(debouncedAmount);

      // Use marketForDepositAsset in simple mode, selectedMarket in advanced mode
      const relevantMarket = marketForDepositAsset || selectedMarket;

      // If user selected wrapped collateral (fxSAVE, wstETH), use amount as-is
      const wrappedCollateralSymbol = relevantMarket?.collateral?.symbol || "";
      const underlyingCollateralSymbol = relevantMarket?.collateral?.underlyingSymbol || "";

      if (selectedDepositAsset?.toLowerCase() === wrappedCollateralSymbol.toLowerCase()) {
        // User selected fxSAVE or wstETH directly
        return inputAmount;
      } else if (selectedDepositAsset?.toLowerCase() === underlyingCollateralSymbol.toLowerCase()) {
        // User selected fxUSD or stETH - need to convert to wrapped collateral for dry run
        // fxSAVE = fxUSD / rate (where rate is fxSAVE:fxUSD ratio, e.g., 1.07 means 1 fxSAVE = 1.07 fxUSD)
        // wstETH = stETH / rate
        const wrappedRate = relevantMarket?.wrappedRate;
        if (wrappedRate && wrappedRate > 0n) {
          // Convert: amountInWrapped = amountInUnderlying * 1e18 / rate
          const amountInWrapped = (inputAmount * BigInt(1e18)) / wrappedRate;
          return amountInWrapped;
        }
        // Fallback: 1:1 if no rate available
        return inputAmount;
      } else {
        // For other assets (USDC, ETH, etc.), use amount as-is
        // The actual conversion will happen in the contract
        return inputAmount;
      }
    } catch {
      return undefined;
    }
  }, [debouncedAmount, selectedDepositAsset, marketForDepositAsset, selectedMarket]);

  const dryRunEnabled =
    !!isValidFeeMinterAddress &&
    !!parsedAmount &&
    isActive &&
    activeTab === "deposit" &&
    !isDirectPeggedDeposit; // Only run for collateral deposits

  if (process.env.NODE_ENV === "development" && activeTab === "deposit") {
    console.log("[Dry Run Enabled Check]", {
      dryRunEnabled,
      isValidFeeMinterAddress,
      parsedAmount: parsedAmount?.toString(),
      isActive,
      activeTab,
      isDirectPeggedDeposit,
      feeMinterAddress,
    });
  }

  // Dry run query using Anvil hook for local development
  // For ETH/stETH deposits, use accurate wstETH amount for fee calculation dry run
  const amountForFeeDryRun = useMemo(() => {
    // If we have accurate wstETH amount from contract, use it
    if (wstETHAmountFromContract) {
      return wstETHAmountFromContract as bigint;
    }
    // Otherwise use parsedAmount (for direct wstETH deposits or other assets)
    return parsedAmount;
  }, [wstETHAmountFromContract, parsedAmount]);

  const {
    data: anvilDryRunData,
    error: anvilDryRunError,
    isFetching: anvilDryRunFetching,
  } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: MINTER_PEGGED_ABI,
    functionName: "mintPeggedTokenDryRun",
    args: amountForFeeDryRun ? [amountForFeeDryRun] : undefined,
    enabled: shouldUseAnvilHook && dryRunEnabled && !!amountForFeeDryRun,
  });

  // Dry run query using regular hook for production
  const {
    data: regularDryRunData,
    error: regularDryRunError,
    isFetching: regularDryRunFetching,
  } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: MINTER_PEGGED_ABI,
    functionName: "mintPeggedTokenDryRun",
    args: amountForFeeDryRun ? [amountForFeeDryRun] : undefined,
    query: {
      enabled: !shouldUseAnvilHook && dryRunEnabled && !!amountForFeeDryRun,
      retry: 1,
    },
  });

  // Use the appropriate dry run data based on environment
  const dryRunData = shouldUseAnvilHook ? anvilDryRunData : regularDryRunData;
  const dryRunError = shouldUseAnvilHook
    ? anvilDryRunError
    : regularDryRunError;
  const dryRunFetching = shouldUseAnvilHook
    ? anvilDryRunFetching
    : regularDryRunFetching;

  if (process.env.NODE_ENV === "development" && activeTab === "deposit") {
    console.log("[Dry Run Data]", {
      dryRunData: dryRunData ? (Array.isArray(dryRunData) ? dryRunData.map(v => typeof v === "bigint" ? v.toString() : v) : dryRunData) : null,
      dryRunError: dryRunError?.message || null,
      parsedAmount: parsedAmount?.toString(),
    });
  }

  // Use dry run data's peggedMinted as fallback when calculateMintPeggedTokenOutput fails
  // dryRunData is an array: [incentiveRatio, fee, discount, peggedMinted, price, rate]
  const expectedMintOutput = useMemo(() => {
    // For swap deposits, use swapDryRunOutput
    if (anyTokenDeposit.needsSwap && swapDryRunOutput && Array.isArray(swapDryRunOutput) && swapDryRunOutput.length >= 4) {
      return swapDryRunOutput[3] as bigint;
    }

    // For swap deposits without dry run, estimate from swap quote
    // This provides a rough estimate when dry run isn't available (e.g., very small amounts)
    if (anyTokenDeposit.needsSwap && anyTokenDeposit.swapQuote && swappedAmountForDryRun && amount && parseFloat(amount) > 0) {
      // Use swappedAmountForDryRun as an estimate - it's the wrapped collateral amount
      // The minter typically mints close to 1:1 with wrapped collateral (minus fees)
      // This is a rough estimate, but better than showing 0
      const estimatedOutput = swappedAmountForDryRun * 95n / 100n; // Estimate 5% fee
      if (estimatedOutput > 0n) {
        if (process.env.NODE_ENV === "development") {
          console.log("[expectedMintOutput] Using estimated output from swap quote:", estimatedOutput.toString());
        }
        return estimatedOutput;
      }
    }

    // For regular deposits, use rawExpectedMintOutput
    if (rawExpectedMintOutput) return rawExpectedMintOutput;
    // Fallback to dry run data's peggedMinted (index 3)
    if (dryRunData && Array.isArray(dryRunData) && dryRunData.length >= 4) {
      return dryRunData[3] as bigint;
    }
    return undefined;
  }, [anyTokenDeposit.needsSwap, swapDryRunOutput, rawExpectedMintOutput, dryRunData, anyTokenDeposit.swapQuote, swappedAmountForDryRun, amount]);

  // Calculate fee percentage from dry run result and detect mint cap
  const feePercentage = useMemo(() => {
    // Don't calculate fee for direct pegged token deposits (no minting)
    if (isDirectPeggedDeposit) return undefined;

    // For swap deposits, use swapDryRunOutput
    if (anyTokenDeposit.needsSwap) {
      if (!swapDryRunOutput || !swappedAmountForDryRun || swappedAmountForDryRun === 0n) return undefined;

      const dryRunResult = swapDryRunOutput as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
      if (!dryRunResult || dryRunResult.length < 2) return undefined;

      // Use incentiveRatio (index 0) from dry run to get the fee percentage
      const incentiveRatio = dryRunResult[0];
      const incentiveRatioBN = BigInt(incentiveRatio);

      // Check if minting is disallowed (incentiveRatio === 1e18)
      const isDisallowed = incentiveRatioBN === 1000000000000000000n; // 1e18
      if (isDisallowed) {
        return undefined; // Don't show fee if minting is disallowed
      }

      // Convert incentiveRatio to percentage: divide by 1e16 to get percentage
      let feePercent = 0;
      if (incentiveRatioBN > 0n) {
        feePercent = Number(incentiveRatioBN) / 1e16; // convert to percent
      } else if (incentiveRatioBN < 0n) {
        // Negative means discount, but we still show it as 0% fee
        feePercent = 0;
      }

      return feePercent;
    }

    // For regular deposits, use dryRunData
    // If there's an error, return undefined (will show fallback fee)
    if (dryRunError) {
      return undefined;
    }

    if (!dryRunData || !parsedAmount || parsedAmount === 0n) return undefined;

    // Handle both array and object formats
    let dryRunResult: [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
    if (Array.isArray(dryRunData)) {
      dryRunResult = dryRunData as [bigint, bigint, bigint, bigint, bigint, bigint];
    } else if (typeof dryRunData === "object" && dryRunData !== null) {
      // Handle object format if returned
      const obj = dryRunData as unknown as Record<string, bigint | undefined>;
      if (obj.incentiveRatio !== undefined) {
        dryRunResult = [
          BigInt(obj.incentiveRatio || 0),
          BigInt(obj.fee || 0),
          BigInt(obj.discount || 0),
          BigInt(obj.peggedMinted || 0),
          BigInt(obj.price || 0),
          BigInt(obj.rate || 0),
        ];
      }
    }

    if (!dryRunResult || dryRunResult.length < 1) {
    if (process.env.NODE_ENV === "development") {
        console.warn("[Fee Calculation] Invalid dry run result structure:", dryRunData);
    }
      return undefined;
    }

    // Use incentiveRatio (index 0) from dry run to get the fee percentage
    // This is the correct way as it returns the exact fee percentage for the current CR band
    // Format: incentiveRatio is in 1e18 units, where 0.25% = 0.0025 * 1e18 = 2500000000000000
    const incentiveRatio = dryRunResult[0];
    if (incentiveRatio === undefined || incentiveRatio === null) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Fee Calculation] incentiveRatio is missing from dry run result");
      }
      return undefined;
    }

    const incentiveRatioBN = BigInt(incentiveRatio);

    // Check if minting is disallowed (incentiveRatio === 1e18)
    const isDisallowed = incentiveRatioBN === 1000000000000000000n; // 1e18
    if (isDisallowed) {
      return undefined; // Don't show fee if minting is disallowed
    }

    // Convert incentiveRatio to percentage: divide by 1e16 to get percentage
    // Positive values = fee, negative values = discount
    let feePercent = 0;
    if (incentiveRatioBN > 0n) {
      feePercent = Number(incentiveRatioBN) / 1e16; // convert to percent
    } else if (incentiveRatioBN < 0n) {
      // Negative means discount, but we still show it as 0% fee
      feePercent = 0;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Fee Calculation Debug] Using incentiveRatio from dry run:", {
        dryRunData: Array.isArray(dryRunData) ? dryRunData.map(v => typeof v === "bigint" ? v.toString() : String(v)) : dryRunData,
        dryRunResult: dryRunResult.map(v => v.toString()),
        incentiveRatio: incentiveRatio.toString(),
        incentiveRatioBN: incentiveRatioBN.toString(),
        feePercent,
        parsedAmount: parsedAmount.toString(),
        selectedDepositAsset,
        activeCollateralSymbol,
        isWstETH: activeCollateralSymbol?.toLowerCase() === "wsteth",
        isFxSAVE: activeCollateralSymbol?.toLowerCase() === "fxsave",
      });
    }

    return feePercent;
  }, [anyTokenDeposit.needsSwap, swapDryRunOutput, swappedAmountForDryRun, dryRunData, dryRunError, parsedAmount, isDirectPeggedDeposit, activeMarketForFees, market, selectedDepositAsset, activeCollateralSymbol, btcPrice, ethPrice]);

  const mintValidation = useMemo(() => {
    const hasAmount = !!amount && parseFloat(amount) > 0;

    if (anyTokenDeposit.needsSwap) {
      return resolveMintValidation({
        isDirectPeggedDeposit,
        hasAmount,
        isLoading:
          anyTokenDeposit.isLoadingSwapQuote ||
          (!!swappedAmountForDryRun &&
            swappedAmountForDryRun > 0n &&
            swapDryRunFetching &&
            !swapDryRunOutput),
        hasDryRunError: !!swapDryRunError,
        dryRun: parseMintDryRunResult(swapDryRunOutput),
        inputAmountWrapped: swappedAmountForDryRun,
      });
    }

    return resolveMintValidation({
      isDirectPeggedDeposit,
      hasAmount,
      isLoading:
        !!amountForFeeDryRun &&
        amountForFeeDryRun > 0n &&
        dryRunFetching &&
        !dryRunData,
      hasDryRunError: !!dryRunError,
      dryRun: parseMintDryRunResult(dryRunData),
      inputAmountWrapped: amountForFeeDryRun,
    });
  }, [
    amount,
    anyTokenDeposit.needsSwap,
    anyTokenDeposit.isLoadingSwapQuote,
    isDirectPeggedDeposit,
    swappedAmountForDryRun,
    swapDryRunFetching,
    swapDryRunOutput,
    swapDryRunError,
    amountForFeeDryRun,
    dryRunFetching,
    dryRunData,
    dryRunError,
  ]);

  return {
    parsedAmount,
    dryRunEnabled,
    amountForFeeDryRun,
    anvilDryRunData,
    anvilDryRunError,
    regularDryRunData,
    regularDryRunError,
    dryRunData,
    dryRunError,
    dryRunFetching,
    expectedMintOutput,
    feePercentage,
    mintValidation,
  };
}
