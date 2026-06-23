"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseUnits } from "viem";
import { HARBOR_TIDE_DISTRIBUTOR_ABI } from "@/abis/harborTideDistributor";
import { ERC20_ABI } from "@/abis/shared";
import { TIDE_CONFIG } from "@/config/tide";
import { useTideTransactionModal } from "@/hooks/useTideTransactionModal";
import { formatToken } from "@/utils/formatters";
import { parseTideClaimError } from "@/utils/tideDistributor";

export function useTideSwap() {
  const { address, isConnected } = useAccount();
  const [baoAmount, setBaoAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const txModal = useTideTransactionModal();

  const distributor = TIDE_CONFIG.distributorAddress;
  const baoToken = TIDE_CONFIG.baoTokenAddress;

  const baoAmountWei = useMemo(() => {
    if (!baoAmount || !Number.isFinite(Number(baoAmount)) || Number(baoAmount) <= 0) {
      return 0n;
    }
    try {
      return parseUnits(baoAmount, TIDE_CONFIG.baoDecimals);
    } catch {
      return 0n;
    }
  }, [baoAmount]);

  const { data: balanceRaw, isLoading: isBalanceLoading, refetch: refetchBalance } =
    useReadContract({
      address: baoToken,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      chainId: TIDE_CONFIG.chainId,
      query: {
        enabled: isConnected && !!address,
        refetchInterval: 30_000,
      },
    });

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: baoToken,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, distributor] : undefined,
    chainId: TIDE_CONFIG.chainId,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 15_000,
    },
  });

  const { data: tideOutWei, isLoading: isPreviewLoading } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "baoToTide",
    args: [baoAmountWei],
    chainId: TIDE_CONFIG.chainId,
    query: { enabled: baoAmountWei > 0n },
  });

  const { data: minTideOut } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "MIN_TIDE_OUT",
    chainId: TIDE_CONFIG.chainId,
  });

  const { data: startDate } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "startDate",
    chainId: TIDE_CONFIG.chainId,
  });

  const { data: endDate } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "endDate",
    chainId: TIDE_CONFIG.chainId,
  });

  const { data: maxBaoCap } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "MAX_BAO",
    chainId: TIDE_CONFIG.chainId,
  });

  const balance = balanceRaw ?? 0n;

  const maxBaoWei = useMemo(() => {
    if (isConnected && balance > 0n) return balance;
    return (maxBaoCap ?? 0n) as bigint;
  }, [isConnected, balance, maxBaoCap]);

  const { data: maxTideOutWei } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "baoToTide",
    args: [maxBaoWei],
    chainId: TIDE_CONFIG.chainId,
    query: { enabled: maxBaoWei > 0n },
  });

  const allowance = allowanceRaw ?? 0n;
  const balanceFormatted = formatToken(balance, TIDE_CONFIG.baoDecimals, 4);

  const tideOut = (tideOutWei ?? 0n) as bigint;
  const minOut = (minTideOut ?? 0n) as bigint;
  const windowStart = startDate as bigint | undefined;
  const windowEnd = endDate as bigint | undefined;

  const tideOutput = tideOutWei
    ? formatToken(tideOut, TIDE_CONFIG.tideDecimals, 4)
    : "";

  const exceedsBalance = baoAmountWei > 0n && baoAmountWei > balance;
  const belowMinOut =
    baoAmountWei > 0n && tideOutWei !== undefined && minTideOut !== undefined && tideOut < minOut;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const windowOpen =
    windowStart !== undefined &&
    windowEnd !== undefined &&
    now >= windowStart &&
    now < windowEnd;

  const needsApproval = baoAmountWei > 0n && allowance < baoAmountWei;

  const canSwap =
    isConnected &&
    windowOpen &&
    baoAmountWei > 0n &&
    !exceedsBalance &&
    !belowMinOut &&
    !isSwapping;

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TIDE_CONFIG.chainId });

  const executeSwap = useCallback(async () => {
    if (!canSwap || !address) return;

    setSwapError(null);
    setIsSwapping(true);

    try {
      if (needsApproval) {
        txModal.openAwaitingWallet(
          "Approve BAO",
          "Confirm the BAO approval in your wallet."
        );

        const approveHash = await writeContractAsync({
          address: baoToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [distributor, baoAmountWei],
          chainId: TIDE_CONFIG.chainId,
        });

        txModal.openConfirming(
          "Approve BAO",
          "Waiting for approval confirmation…",
          approveHash
        );
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }

      txModal.openAwaitingWallet(
        "Swap BAO for TIDE",
        "Confirm the swap in your wallet."
      );

      const swapHash = await writeContractAsync({
        address: distributor,
        abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
        functionName: "convertBao",
        args: [baoAmountWei],
        chainId: TIDE_CONFIG.chainId,
      });

      txModal.openConfirming(
        "Swap BAO for TIDE",
        "Waiting for swap confirmation…",
        swapHash
      );

      await publicClient?.waitForTransactionReceipt({ hash: swapHash });
      await refetchBalance();

      const received = tideOutWei
        ? formatToken(tideOut, TIDE_CONFIG.tideDecimals, 4)
        : tideOutput;

      txModal.openSuccess(
        "Swap successful",
        `You received ${received} TIDE in your wallet.`,
        swapHash
      );
      setBaoAmount("");
    } catch (error) {
      const message = parseTideClaimError(error);
      setSwapError(message);
      txModal.openError("Swap failed", message);
    } finally {
      setIsSwapping(false);
    }
  }, [
    canSwap,
    address,
    needsApproval,
    writeContractAsync,
    baoToken,
    distributor,
    baoAmountWei,
    publicClient,
    refetchAllowance,
    refetchBalance,
    tideOut,
    tideOutput,
    txModal,
  ]);

  const swapRateLabel = "0.1758 TIDE per BAO";

  const maxSwapConversionLabel = useMemo(() => {
    if (maxBaoWei <= 0n || maxTideOutWei === undefined) return null;
    const baoLabel = formatToken(maxBaoWei, TIDE_CONFIG.baoDecimals, 0);
    const tideLabel = formatToken(
      maxTideOutWei as bigint,
      TIDE_CONFIG.tideDecimals,
      0
    );
    return `${baoLabel} BAO → ${tideLabel} TIDE`;
  }, [maxBaoWei, maxTideOutWei]);

  return {
    isConnected,
    balance,
    balanceFormatted,
    baoAmount,
    setBaoAmount,
    tideOutput,
    exceedsBalance,
    belowMinOut,
    minTideOutFormatted: minTideOut
      ? formatToken(minOut, TIDE_CONFIG.tideDecimals, 0)
      : "10",
    windowOpen,
    needsApproval,
    canSwap,
    isBalanceLoading,
    isPreviewLoading,
    isSwapping,
    swapError,
    executeSwap,
    swapRateLabel,
    maxSwapConversionLabel,
    txModal: txModal.modal,
    closeTxModal: txModal.close,
  };
}
