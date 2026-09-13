"use client";

import { useEffect, useMemo } from "react";
import { formatEther, parseEther } from "viem";
import { useContractRead, useContractReads } from "wagmi";
import { ERC20_ABI, MINTER_PEGGED_ABI } from "@/abis";
import type {
  AnchorModalFlowPage,
  AnchorModalMarketEntry,
  AnchorModalPositionAmounts,
} from "./modalHookTypes";
import {
  isRedeemAmountCapped,
  parseRedeemDryRunTuple,
} from "./redeemDryRunParsing";
import type { AnchorDepositWithdrawTab } from "./types";

export type UseRedeemRouteAndPreviewParams = {
  isActive: boolean;
  activeTab: AnchorDepositWithdrawTab;
  simpleMode: boolean;
  address: `0x${string}` | undefined;
  /** All markets sharing this ha token (single-element when the modal is market-scoped). */
  marketsForToken: readonly AnchorModalMarketEntry[];
  selectedMarketId: string;
  collateralSymbol: string;
  peggedTokenAddress: string | undefined;
  minterAddress: string | undefined;
  isValidMinterAddress: boolean;
  /** `true` routes reads through the local-dev (Anvil) variant. */
  shouldUseAnvilHook: boolean;
  amount: string;
  positionAmounts: AnchorModalPositionAmounts;
  flowPage: AnchorModalFlowPage;
  withdrawOnly: boolean;
  sellRedeemSource: "pool" | "wallet";
  selectedRedeemAsset: string;
  setSelectedRedeemAsset: (value: string) => void;
  selectedRedeemMarketId: string;
  setSelectedRedeemMarketId: (value: string) => void;
  redeemMarketSelectionMode: "auto" | "manual";
  /** Redeem fee per market id, used to label the route options. */
  redeemMarketFeesMap: Map<string, number | undefined>;
  fxSAVEPrice: number | null | undefined;
  wstETHPrice: number | null | undefined;
  stETHPrice: number | null | undefined;
};

/**
 * Redeem-side pricing: resolves which market the redemption routes through, dry-runs
 * `redeemPeggedTokenDryRun` for the requested amount (single market plus every market in
 * the group), and derives the route options / recommendation the route step renders.
 *
 * `redeemPreview.isCapped` marks the case where the market collateral ratio limits a
 * single redeem transaction below the requested amount.
 */
export function useRedeemRouteAndPreview({
  isActive,
  activeTab,
  simpleMode,
  address,
  marketsForToken,
  selectedMarketId,
  collateralSymbol,
  peggedTokenAddress,
  minterAddress,
  isValidMinterAddress,
  shouldUseAnvilHook,
  amount,
  positionAmounts,
  flowPage,
  withdrawOnly,
  sellRedeemSource,
  selectedRedeemAsset,
  setSelectedRedeemAsset,
  selectedRedeemMarketId,
  setSelectedRedeemMarketId,
  redeemMarketSelectionMode,
  redeemMarketFeesMap,
  fxSAVEPrice,
  wstETHPrice,
  stETHPrice,
}: UseRedeemRouteAndPreviewParams) {
  // Calculate expected redeem output - need to check if withdrawing from stability pool or ha tokens
  // If from stability pool, we need to withdraw first to get pegged tokens, then redeem
  // If from ha tokens, we can redeem directly
  // Get minter address for selected redeem asset
  const selectedRedeemMarket = useMemo(() => {
    if (selectedRedeemMarketId) {
      const fromRedeem = marketsForToken.find(
        (m) => m.marketId === selectedRedeemMarketId
      );
      if (fromRedeem) return fromRedeem;
    }

    const fromPool = marketsForToken.find(
      (m) => m.marketId === selectedMarketId
    );
    if (fromPool) return fromPool;

    const assetSymbol = selectedRedeemAsset || collateralSymbol;
    return marketsForToken.find(
      ({ market: m }) => m?.collateral?.symbol === assetSymbol
    );
  }, [
    selectedRedeemMarketId,
    selectedMarketId,
    selectedRedeemAsset,
    collateralSymbol,
    marketsForToken,
  ]);

  const redeemCollateralSymbol =
    selectedRedeemMarket?.market?.collateral?.symbol || collateralSymbol;

  const redeemMinterAddress = selectedRedeemMarket?.market?.addresses?.minter;
  const isValidRedeemMinterAddress =
    redeemMinterAddress &&
    typeof redeemMinterAddress === "string" &&
    redeemMinterAddress.startsWith("0x") &&
    redeemMinterAddress.length === 42;

  // Check allowance for pegged token to the redeem minter (uses the redeem market)
  const redeemAllowancePeggedTokenAddress =
    selectedRedeemMarket?.market?.addresses?.peggedToken || peggedTokenAddress;
  const redeemAllowanceMinterAddress =
    selectedRedeemMarket?.market?.addresses?.minter || minterAddress;

  const {
    data: peggedTokenMinterAllowanceData,
    refetch: refetchPeggedTokenMinterAllowance,
  } = useContractRead({
    address: redeemAllowancePeggedTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      address && redeemAllowanceMinterAddress
        ? [address, redeemAllowanceMinterAddress as `0x${string}`]
        : undefined,
    query: {
      enabled:
        !!address &&
        !!redeemAllowancePeggedTokenAddress &&
        !!redeemAllowanceMinterAddress &&
        isActive &&
        activeTab === "withdraw",
      refetchInterval: isActive ? 15000 : false, // Only poll when modal is open, reduced from 5s to 15s
      retry: 1,
      allowFailure: true,
    },
  });

  // Calculate total amount for redeem output calculation (from position amounts or single amount)
  const redeemInputAmount = useMemo(() => {
    let total = 0n;

    if (
      (activeTab === "withdraw" || activeTab === "sell") &&
      (positionAmounts.wallet ||
        positionAmounts.collateralPool ||
        positionAmounts.sailPool)
    ) {
      if (positionAmounts.wallet && parseFloat(positionAmounts.wallet) > 0) {
        total += parseEther(positionAmounts.wallet);
      }
      if (
        positionAmounts.collateralPool &&
        parseFloat(positionAmounts.collateralPool) > 0
      ) {
        total += parseEther(positionAmounts.collateralPool);
      }
      if (
        positionAmounts.sailPool &&
        parseFloat(positionAmounts.sailPool) > 0
      ) {
        total += parseEther(positionAmounts.sailPool);
      }
    } else if (amount && parseFloat(amount) > 0) {
      total = parseEther(amount);
    }

    if (simpleMode && activeTab === "sell") {
      if (positionAmounts.wallet && parseFloat(positionAmounts.wallet) > 0) {
        return parseEther(positionAmounts.wallet);
      }
      return undefined;
    }

    if (
      simpleMode &&
      activeTab === "withdraw" &&
      (flowPage === 2 || flowPage === 3) &&
      !withdrawOnly
    ) {
      let poolTotal = 0n;
      if (
        positionAmounts.collateralPool &&
        parseFloat(positionAmounts.collateralPool) > 0
      ) {
        poolTotal += parseEther(positionAmounts.collateralPool);
      }
      if (
        positionAmounts.sailPool &&
        parseFloat(positionAmounts.sailPool) > 0
      ) {
        poolTotal += parseEther(positionAmounts.sailPool);
      }

      if (sellRedeemSource === "wallet" || poolTotal === 0n) {
        if (positionAmounts.wallet && parseFloat(positionAmounts.wallet) > 0) {
          return parseEther(positionAmounts.wallet);
        }
        return undefined;
      }

      return poolTotal > 0n ? poolTotal : undefined;
    }

    return total > 0n ? total : undefined;
  }, [
    activeTab,
    positionAmounts,
    amount,
    simpleMode,
    flowPage,
    withdrawOnly,
    sellRedeemSource,
  ]);

  // Dry-run redeem to fetch fee/discount and output before user confirms
  const redeemDryRunAddress = isValidRedeemMinterAddress
    ? (redeemMinterAddress as `0x${string}`)
    : isValidMinterAddress
    ? (minterAddress as `0x${string}`)
    : undefined;

  const redeemDryRunEnabled =
    !!redeemDryRunAddress &&
    !!redeemInputAmount &&
    redeemInputAmount > 0n &&
    isActive &&
    ((activeTab === "withdraw" && !withdrawOnly) || activeTab === "sell");

  // Prefer the anvil hook on local dev (matches mint-fee flow)
  const { data: anvilRedeemDryRunData, error: anvilRedeemDryRunError } =
    useContractRead({
      address: redeemDryRunAddress,
      abi: MINTER_PEGGED_ABI,
      functionName: "redeemPeggedTokenDryRun",
      args: redeemInputAmount && redeemInputAmount > 0n ? [redeemInputAmount] : undefined,
      enabled: shouldUseAnvilHook && redeemDryRunEnabled && !!redeemInputAmount && redeemInputAmount > 0n,
    });

  const { data: regularRedeemDryRunData, error: regularRedeemDryRunError } =
    useContractRead({
      address: redeemDryRunAddress,
      abi: MINTER_PEGGED_ABI,
      functionName: "redeemPeggedTokenDryRun",
      args: redeemInputAmount && redeemInputAmount > 0n ? [redeemInputAmount] : undefined,
      query: {
        enabled: !shouldUseAnvilHook && redeemDryRunEnabled && !!redeemInputAmount && redeemInputAmount > 0n,
        retry: 1,
        allowFailure: true,
      },
    });

  const redeemDryRunData = shouldUseAnvilHook
    ? anvilRedeemDryRunData
    : regularRedeemDryRunData;
  const redeemDryRunError = shouldUseAnvilHook
    ? anvilRedeemDryRunError
    : regularRedeemDryRunError;
  const redeemDryRunLoading =
    redeemDryRunEnabled && !redeemDryRunError && redeemDryRunData === undefined;

  const redeemDryRun = useMemo(() => {
    if (!redeemDryRunData || !Array.isArray(redeemDryRunData)) return null;
    const [
      incentiveRatio,
      fee,
      discount,
      peggedRedeemed,
      wrappedCollateralReturned,
      price,
      rate,
    ] = redeemDryRunData as unknown as [
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint
    ];

    const incentiveRatioBN = BigInt(incentiveRatio);
    const isDisallowed = incentiveRatioBN === 1000000000000000000n; // 1e18

    let feePercentage = 0;
    let discountPercentage = 0;
    if (incentiveRatioBN > 0n) {
      feePercentage = Number(incentiveRatioBN) / 1e16; // convert to percent
    } else if (incentiveRatioBN < 0n) {
      discountPercentage = Number(-incentiveRatioBN) / 1e16;
    }

    return {
      incentiveRatio: incentiveRatioBN,
      fee,
      discount,
      peggedRedeemed,
      wrappedCollateralReturned,
      price,
      rate,
      feePercentage,
      discountPercentage,
      isDisallowed,
      netCollateralReturned: wrappedCollateralReturned,
    };
  }, [redeemDryRunData]);

  /** When collateral ratio limits redemption, dry-run caps peggedRedeemed below the requested amount. */
  const redeemPreview = useMemo(() => {
    if (!redeemDryRun || !redeemInputAmount || redeemInputAmount === 0n) {
      return null;
    }
    const peggedRedeemed = redeemDryRun.peggedRedeemed ?? 0n;
    const wrappedOut = redeemDryRun.wrappedCollateralReturned ?? 0n;
    const isCapped = isRedeemAmountCapped(redeemInputAmount, peggedRedeemed);
    const estimatedTotalWrapped =
      isCapped && peggedRedeemed > 0n
        ? (wrappedOut * redeemInputAmount) / peggedRedeemed
        : wrappedOut;
    return {
      isCapped,
      peggedRedeemed,
      wrappedOut,
      estimatedTotalWrapped,
    };
  }, [redeemDryRun, redeemInputAmount]);

  const { contracts: redeemMarketPreviewContracts, indexMap: redeemMarketPreviewIndexMap } =
    useMemo(() => {
      const contracts: Array<{
        address: `0x${string}`;
        abi: typeof MINTER_PEGGED_ABI;
        functionName: "peggedTokenBalance" | "redeemPeggedTokenDryRun";
        args?: readonly [bigint];
      }> = [];
      const indexMap = new Map<
        number,
        { marketId: string; kind: "supply" | "dryRun" }
      >();

      if (
        !isActive ||
        (activeTab !== "withdraw" && activeTab !== "sell") ||
        withdrawOnly ||
        !redeemInputAmount ||
        redeemInputAmount === 0n ||
        marketsForToken.length <= 1
      ) {
        return { contracts, indexMap };
      }

      for (const { marketId, market: m } of marketsForToken) {
        const minter = m?.addresses?.minter;
        if (
          !minter ||
          typeof minter !== "string" ||
          !minter.startsWith("0x") ||
          minter.length !== 42
        ) {
          continue;
        }
        const addr = minter as `0x${string}`;
        indexMap.set(contracts.length, { marketId, kind: "supply" });
        contracts.push({
          address: addr,
          abi: MINTER_PEGGED_ABI,
          functionName: "peggedTokenBalance",
        });
        indexMap.set(contracts.length, { marketId, kind: "dryRun" });
        contracts.push({
          address: addr,
          abi: MINTER_PEGGED_ABI,
          functionName: "redeemPeggedTokenDryRun",
          args: [redeemInputAmount],
        });
      }

      return { contracts, indexMap };
    }, [
      isActive,
      activeTab,
      withdrawOnly,
      redeemInputAmount,
      marketsForToken,
    ]);

  const { data: redeemMarketPreviewReads } = useContractReads({
    contracts: redeemMarketPreviewContracts,
    query: {
      enabled: redeemMarketPreviewContracts.length > 0,
      refetchInterval: isActive ? 15000 : false,
      retry: 1,
      allowFailure: true,
    },
  });

  const redeemMarketPreviews = useMemo(() => {
    const previews = new Map<
      string,
      {
        peggedSupply: bigint;
        wrappedOut: bigint;
        peggedRedeemed: bigint;
        isCapped: boolean;
        collateralSymbol: string;
        marketName: string;
      }
    >();

    if (!redeemMarketPreviewReads || !redeemInputAmount || redeemInputAmount === 0n) {
      return previews;
    }

    for (const { marketId, market: m } of marketsForToken) {
      previews.set(marketId, {
        peggedSupply: 0n,
        wrappedOut: 0n,
        peggedRedeemed: 0n,
        isCapped: false,
        collateralSymbol: m?.collateral?.symbol || "",
        marketName: m?.name || marketId,
      });
    }

    redeemMarketPreviewReads.forEach((res, idx) => {
      const meta = redeemMarketPreviewIndexMap.get(idx);
      if (!meta) return;
      const prev = previews.get(meta.marketId);
      if (!prev) return;

      if (meta.kind === "supply" && res?.status === "success" && res.result != null) {
        prev.peggedSupply = res.result as bigint;
        return;
      }

      if (meta.kind === "dryRun" && res?.status === "success") {
        const parsed = parseRedeemDryRunTuple(res.result);
        if (!parsed) return;
        prev.peggedRedeemed = parsed.peggedRedeemed;
        prev.wrappedOut = parsed.wrappedCollateralReturned;
        prev.isCapped = isRedeemAmountCapped(
          redeemInputAmount,
          parsed.peggedRedeemed
        );
      }
    });

    return previews;
  }, [
    redeemMarketPreviewReads,
    redeemMarketPreviewIndexMap,
    marketsForToken,
    redeemInputAmount,
  ]);

  const recommendedRedeemMarketId = useMemo(() => {
    if (marketsForToken.length <= 1) return null;

    let bestId: string | null = null;
    let bestScore = -1n;

    for (const { marketId } of marketsForToken) {
      const preview = redeemMarketPreviews.get(marketId);
      // Never recommend a capped path — partial redeems need extra txs.
      if (!preview || preview.wrappedOut === 0n || preview.isCapped) continue;

      if (preview.wrappedOut > bestScore) {
        bestScore = preview.wrappedOut;
        bestId = marketId;
      }
    }

    return bestId;
  }, [marketsForToken, redeemMarketPreviews]);

  const redeemRouteOptions = useMemo(() => {
    return marketsForToken.map(({ marketId, market: m }) => {
      const preview = redeemMarketPreviews.get(marketId);
      const feePercent = redeemMarketFeesMap.get(marketId);
      const collateralSymbol = m?.collateral?.symbol || "";
      const receiveAmount =
        preview && preview.wrappedOut > 0n
          ? Number(formatEther(preview.wrappedOut))
          : undefined;
      const priceUsd =
        collateralSymbol === "fxSAVE"
          ? fxSAVEPrice
          : collateralSymbol === "wstETH" || collateralSymbol === "stETH"
            ? (collateralSymbol === "wstETH" ? wstETHPrice : stETHPrice)
            : undefined;
      const receiveUsd =
        receiveAmount !== undefined &&
        priceUsd !== undefined &&
        priceUsd > 0
          ? receiveAmount * priceUsd
          : undefined;

      return {
        marketId,
        marketName: m?.name || marketId,
        collateralSymbol,
        feePercent,
        receiveAmount:
          receiveAmount !== undefined && Number.isFinite(receiveAmount)
            ? receiveAmount
            : undefined,
        receiveUsd,
        isCapped: preview?.isCapped,
        isBest: !!recommendedRedeemMarketId && marketId === recommendedRedeemMarketId,
      };
    });
  }, [
    marketsForToken,
    redeemMarketPreviews,
    redeemMarketFeesMap,
    recommendedRedeemMarketId,
    fxSAVEPrice,
    wstETHPrice,
    stETHPrice,
  ]);

  const isCrossMarketRedeem =
    !!selectedRedeemMarketId &&
    !!selectedMarketId &&
    selectedRedeemMarketId !== selectedMarketId;

  // Auto mode: follow the recommended (uncapped) redeem market.
  useEffect(() => {
    if (redeemMarketSelectionMode !== "auto" || !recommendedRedeemMarketId) {
      return;
    }
    const recommended = marketsForToken.find(
      (m) => m.marketId === recommendedRedeemMarketId
    );
    if (!recommended) return;
    setSelectedRedeemMarketId(recommendedRedeemMarketId);
    const sym = recommended.market?.collateral?.symbol;
    if (sym) setSelectedRedeemAsset(sym);
  }, [
    redeemMarketSelectionMode,
    recommendedRedeemMarketId,
    marketsForToken,
  ]);

  return {
    selectedRedeemMarket,
    redeemCollateralSymbol,
    redeemMinterAddress,
    isValidRedeemMinterAddress,
    redeemAllowancePeggedTokenAddress,
    redeemAllowanceMinterAddress,
    peggedTokenMinterAllowanceData,
    refetchPeggedTokenMinterAllowance,
    redeemInputAmount,
    redeemDryRunAddress,
    redeemDryRunEnabled,
    anvilRedeemDryRunData,
    anvilRedeemDryRunError,
    regularRedeemDryRunData,
    regularRedeemDryRunError,
    redeemDryRunData,
    redeemDryRunError,
    redeemDryRunLoading,
    redeemDryRun,
    redeemPreview,
    redeemMarketPreviewContracts,
    redeemMarketPreviewIndexMap,
    redeemMarketPreviewReads,
    redeemMarketPreviews,
    recommendedRedeemMarketId,
    redeemRouteOptions,
    isCrossMarketRedeem,
  };
}
