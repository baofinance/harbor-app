"use client";

import { useCallback } from "react";
import { shouldUseAnvil } from "@/config/environment";
import { publicClient as anvilPublicClient } from "@/config/rpc";
import { minterABI as fullMinterABI } from "@/abis/minter";

export interface CompoundFeeEstimateParams {
  leveragedReceived: bigint;
  collateralReceived: bigint;
  minterAddress?: `0x${string}`;
  collateralSymbol: string;
  /** Collateral price in USD (e.g., 3500 for ETH at $3500) */
  collateralPriceUSD?: number;
  publicClient?: any;
}

export interface CompoundFeeEstimateResult {
  fees: {
    feeAmount: bigint;
    feeFormatted: string;
    feeUSD?: number;
    feePercentage?: number;
    tokenSymbol: string;
    label: string;
  }[];
  totalCollateralForMinting: bigint;
  errors?: string[];
}

// Reusable helper to format fee amounts
const formatFeeAmount = (feeAmountNum: number): string => {
  if (feeAmountNum === 0) return "0";
  if (feeAmountNum >= 1) {
    return feeAmountNum.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  }
  if (feeAmountNum >= 0.01) {
    return feeAmountNum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }
  if (feeAmountNum >= 0.0001) {
    return feeAmountNum
      .toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
        useGrouping: false,
      })
      .replace(/\.?0+$/, "");
  }
  if (feeAmountNum > 0) {
    const significantDigits = 8;
    const magnitude = Math.floor(Math.log10(Math.abs(feeAmountNum)));
    const decimals = Math.max(0, significantDigits - magnitude - 1);
    return feeAmountNum.toFixed(decimals).replace(/\.?0+$/, "");
  }
  return "0";
};

export function useCompoundFeeEstimates() {
  const isAnvil = shouldUseAnvil();

  return useCallback(
    async ({
      leveragedReceived,
      collateralReceived,
      minterAddress,
      collateralSymbol,
      collateralPriceUSD,
      publicClient,
    }: CompoundFeeEstimateParams): Promise<CompoundFeeEstimateResult> => {
      const fees: CompoundFeeEstimateResult["fees"] = [];
      const errors: string[] = [];
      let totalCollateralForMinting = collateralReceived;

      console.log("[useCompoundFeeEstimates] Starting fee estimation:", {
        leveragedReceived: leveragedReceived.toString(),
        collateralReceived: collateralReceived.toString(),
        minterAddress,
        collateralSymbol,
        collateralPriceUSD,
        isAnvil,
        hasPublicClient: !!publicClient,
      });

      if (!minterAddress) {
        console.log("[useCompoundFeeEstimates] No minter address, skipping");
        errors.push("No minter address provided");
        return { fees, totalCollateralForMinting, errors };
      }

      const client = isAnvil ? anvilPublicClient : publicClient;
      if (!client) {
        console.log("[useCompoundFeeEstimates] No client available");
        errors.push("No blockchain client available");
        return { fees, totalCollateralForMinting, errors };
      }

      console.log(
        "[useCompoundFeeEstimates] Using collateral price USD:",
        collateralPriceUSD
      );

      // Redeem fee (for leveraged tokens)
      if (leveragedReceived > 0n) {
        console.log(
          "[useCompoundFeeEstimates] Calculating redeem fee for",
          leveragedReceived.toString()
        );
        try {
          const redeemDryRunResult = (await client.readContract({
            address: minterAddress,
            abi: fullMinterABI,
            functionName: "redeemLeveragedTokenDryRun",
            args: [leveragedReceived],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

          console.log(
            "[useCompoundFeeEstimates] Redeem dry run result:",
            redeemDryRunResult
          );

          if (
            redeemDryRunResult &&
            Array.isArray(redeemDryRunResult) &&
            redeemDryRunResult.length >= 4
          ) {
            const wrappedFee = redeemDryRunResult[1] as bigint;
            const wrappedCollateralReturned = redeemDryRunResult[3] as
              | bigint
              | undefined;

            if (typeof wrappedFee === "bigint" && wrappedFee >= 0n) {
              const feeAmountNum = Number(wrappedFee) / 1e18;
              const feeFormatted = formatFeeAmount(feeAmountNum);
              const feePercentage =
                leveragedReceived > 0n
                  ? (Number(wrappedFee) / Number(leveragedReceived)) * 100
                  : 0;

              let feeUSD: number | undefined;
              if (collateralPriceUSD && collateralPriceUSD > 0) {
                feeUSD = feeAmountNum * collateralPriceUSD;
              }

              console.log("[useCompoundFeeEstimates] Redeem fee calculated:", {
                feeAmount: wrappedFee.toString(),
                feeFormatted,
                feePercentage,
                feeUSD,
                collateralPriceUSD,
              });

              fees.push({
                feeAmount: wrappedFee,
                feeFormatted,
                feeUSD,
                feePercentage,
                tokenSymbol: collateralSymbol,
                label: "Redeem Leveraged Tokens",
              });

              if (typeof wrappedCollateralReturned === "bigint") {
                totalCollateralForMinting =
                  collateralReceived + wrappedCollateralReturned;
              }
            }
          }
        } catch (error: any) {
          console.error(
            "[useCompoundFeeEstimates] Redeem dry run failed:",
            error
          );
          errors.push(
            `Redeem fee estimation failed: ${error?.message || "Unknown error"}`
          );
        }
      }

      // Mint fee (for pegged token minting)
      if (totalCollateralForMinting > 0n) {
        console.log(
          "[useCompoundFeeEstimates] Calculating mint fee for",
          totalCollateralForMinting.toString()
        );
        try {
          const mintDryRunResult = (await client.readContract({
            address: minterAddress,
            abi: fullMinterABI,
            functionName: "mintPeggedTokenDryRun",
            args: [totalCollateralForMinting],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

          console.log(
            "[useCompoundFeeEstimates] Mint dry run result:",
            mintDryRunResult
          );

          if (
            mintDryRunResult &&
            Array.isArray(mintDryRunResult) &&
            mintDryRunResult.length >= 2
          ) {
            const wrappedFee = mintDryRunResult[1] as bigint;

            if (typeof wrappedFee === "bigint" && wrappedFee >= 0n) {
              const feeAmountNum = Number(wrappedFee) / 1e18;
              const feeFormatted = formatFeeAmount(feeAmountNum);
              const feePercentage =
                totalCollateralForMinting > 0n
                  ? (Number(wrappedFee) / Number(totalCollateralForMinting)) *
                    100
                  : 0;

              let feeUSD: number | undefined;
              if (collateralPriceUSD && collateralPriceUSD > 0) {
                feeUSD = feeAmountNum * collateralPriceUSD;
              }

              console.log("[useCompoundFeeEstimates] Mint fee calculated:", {
                feeAmount: wrappedFee.toString(),
                feeFormatted,
                feePercentage,
                feeUSD,
                collateralPriceUSD,
              });

              fees.push({
                feeAmount: wrappedFee,
                feeFormatted,
                feeUSD,
                feePercentage,
                tokenSymbol: collateralSymbol,
                label: "Mint Pegged Tokens",
              });
            }
          }
        } catch (error: any) {
          console.error(
            "[useCompoundFeeEstimates] Mint dry run failed:",
            error
          );
          errors.push(
            `Mint fee estimation failed: ${error?.message || "Unknown error"}`
          );
        }
      }

      console.log("[useCompoundFeeEstimates] Fee estimation complete:", {
        feesCount: fees.length,
        fees,
        totalCollateralForMinting: totalCollateralForMinting.toString(),
        errors,
      });

      return { fees, totalCollateralForMinting, errors };
    },
    [isAnvil]
  );
}
