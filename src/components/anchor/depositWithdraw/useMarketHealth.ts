"use client";

import { useMemo } from "react";
import { formatEther } from "viem";
import { useContractRead } from "wagmi";
import { MINTER_PEGGED_ABI } from "@/abis";
import { MINTER_ABI } from "@/abis/shared";
import {
  MARKET_HEALTH_MINT_PROBE_WEI,
  MAX_UINT256,
  classifyMarketHealthStatus,
  classifyMarketLiquidityStatus,
  isSaturatedCollateralRatio,
  maxMintableWrappedToDepositAmount,
} from "@/utils/anchorMarketHealth";
import { parseMintDryRunResult } from "@/utils/anchorMintValidation";
import { resolveMinCollateralRatio } from "@/utils/sailMarketMetrics";
import type { AnchorModalMarket } from "./modalHookTypes";
import type { AnchorDepositWithdrawTab } from "./types";

export type UseMarketHealthParams = {
  /** Minter used for fee/health reads (deposit-asset market in simple mode). */
  feeMinterAddress: string | undefined;
  isValidFeeMinterAddress: boolean;
  isActive: boolean;
  activeTab: AnchorDepositWithdrawTab;
  isDirectPeggedDeposit: boolean;
  wrappedCollateralPriceUSD: number;
  activeMarketForFees: AnchorModalMarket;
  peggedTokenSymbol: string;
  selectedDepositAsset: string;
  activeCollateralSymbol: string;
  activeWrappedCollateralSymbol: string;
};

/**
 * Collateral-ratio / mint-capacity reads for the market being deposited into, plus the
 * derived `marketHealth` summary the modal renders (health + liquidity status, max
 * mintable in ha / USD / deposit-asset units).
 */
export function useMarketHealth({
  feeMinterAddress,
  isValidFeeMinterAddress,
  isActive,
  activeTab,
  isDirectPeggedDeposit,
  wrappedCollateralPriceUSD,
  activeMarketForFees,
  peggedTokenSymbol,
  selectedDepositAsset,
  activeCollateralSymbol,
  activeWrappedCollateralSymbol,
}: UseMarketHealthParams) {
  const marketHealthReadsEnabled =
    !!isValidFeeMinterAddress &&
    isActive &&
    activeTab === "deposit" &&
    !isDirectPeggedDeposit;

  const {
    data: marketHealthCollateralRatio,
    isFetching: marketHealthCrFetching,
  } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    // Same ABI Transparency / Earn market cards use — MINTER_PEGGED_ABI lacks collateralRatio.
    abi: MINTER_ABI,
    functionName: "collateralRatio",
    query: {
      enabled: marketHealthReadsEnabled,
      retry: 2,
    },
  });

  const { data: marketHealthMinterConfig } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: MINTER_ABI,
    functionName: "config",
    query: {
      enabled: marketHealthReadsEnabled,
      retry: 2,
    },
  });

  const { data: marketHealthPeggedBalance } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: MINTER_ABI,
    functionName: "peggedTokenBalance",
    query: {
      enabled: marketHealthReadsEnabled,
      retry: 1,
    },
  });

  const { data: marketHealthCollateralBalance } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: MINTER_ABI,
    functionName: "collateralTokenBalance",
    query: {
      enabled: marketHealthReadsEnabled,
      retry: 1,
    },
  });

  const {
    data: marketHealthCapacityDryRun,
    isFetching: marketHealthCapacityFetching,
  } = useContractRead({
    address: feeMinterAddress as `0x${string}`,
    abi: MINTER_PEGGED_ABI,
    functionName: "mintPeggedTokenDryRun",
    args: [MARKET_HEALTH_MINT_PROBE_WEI],
    query: {
      enabled: marketHealthReadsEnabled,
      retry: 1,
    },
  });

  const marketHealth = useMemo(() => {
    if (!marketHealthReadsEnabled) return null;

    const rawCr = marketHealthCollateralRatio as bigint | undefined;
    const pegBal = marketHealthPeggedBalance as bigint | undefined;
    const collBal = marketHealthCollateralBalance as bigint | undefined;
    // Match Earn market-card fallback: CR = collateral / debt when the view fails.
    let cr: bigint | undefined = rawCr;
    if (cr === undefined && collBal !== undefined && pegBal !== undefined) {
      if (pegBal === 0n) {
        cr = MAX_UINT256;
      } else if (pegBal > 0n) {
        cr = (collBal * 10n ** 18n) / pegBal;
      }
    } else if (cr === undefined && pegBal === 0n) {
      cr = MAX_UINT256;
    }
    const minCr = resolveMinCollateralRatio(
      undefined,
      marketHealthMinterConfig,
    );

    let maxMintableUsd: number | undefined;
    let maxMintableHa: number | undefined;
    let maxMintableWrappedWei: bigint | undefined;
    let maxMintableDepositAmount: number | undefined;
    const haSymbol =
      activeMarketForFees?.peggedToken?.symbol || peggedTokenSymbol || "ha";

    const parsedCapacity = parseMintDryRunResult(marketHealthCapacityDryRun);
    if (parsedCapacity) {
      const wrappedTaken = parsedCapacity.wrappedCollateralTaken;
      const peggedMinted = parsedCapacity.peggedMinted;
      maxMintableWrappedWei = wrappedTaken;
      maxMintableHa = Number(formatEther(peggedMinted));

      if (wrappedTaken > 0n && wrappedCollateralPriceUSD > 0) {
        maxMintableUsd =
          Number(formatEther(wrappedTaken)) * wrappedCollateralPriceUSD;
      } else if (wrappedTaken === 0n) {
        maxMintableUsd = 0;
      }

      maxMintableDepositAmount = maxMintableWrappedToDepositAmount({
        wrappedTaken,
        depositAsset: selectedDepositAsset || activeCollateralSymbol,
        wrappedCollateralSymbol:
          activeMarketForFees?.collateral?.symbol ||
          activeWrappedCollateralSymbol,
        underlyingCollateralSymbol:
          activeMarketForFees?.collateral?.underlyingSymbol,
        wrappedRate: activeMarketForFees?.wrappedRate as bigint | undefined,
      });
    }

    return {
      collateralRatio: cr,
      maxMintableUsd,
      maxMintableHa,
      maxMintableHaSymbol: haSymbol,
      maxMintableDepositAmount,
      maxMintableWrappedWei,
      healthStatus: classifyMarketHealthStatus(cr, minCr, maxMintableUsd),
      liquidityStatus: classifyMarketLiquidityStatus(maxMintableUsd),
      isLoading:
        (marketHealthCrFetching && cr === undefined) ||
        (marketHealthCapacityFetching && maxMintableUsd === undefined),
      isSaturatedCr: isSaturatedCollateralRatio(cr),
    };
  }, [
    marketHealthReadsEnabled,
    marketHealthCollateralRatio,
    marketHealthPeggedBalance,
    marketHealthCollateralBalance,
    marketHealthMinterConfig,
    marketHealthCapacityDryRun,
    wrappedCollateralPriceUSD,
    marketHealthCrFetching,
    marketHealthCapacityFetching,
    activeMarketForFees,
    peggedTokenSymbol,
    selectedDepositAsset,
    activeCollateralSymbol,
    activeWrappedCollateralSymbol,
  ]);

  return { marketHealthReadsEnabled, marketHealth };
}

export type AnchorMarketHealth = ReturnType<
  typeof useMarketHealth
>["marketHealth"];
