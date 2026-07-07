"use client";

import { useCallback, useMemo, useState } from "react";
import {
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseUnits } from "viem";
import { HARBOR_TIDE_DISTRIBUTOR_ABI } from "@/abis/harborTideDistributor";
import { ERC20_ABI } from "@/abis/shared";
import { TIDE_CONFIG } from "@/config/tide";
import { useTideTransaction } from "@/contexts/TideTransactionContext";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { useTideDistributorWindow } from "@/hooks/useTideDistributorWindow";
import { formatToken } from "@/utils/formatters";
import { runHarborTransactionFlow } from "@/utils/harborTransactionFlow";
import { parseTideClaimError } from "@/utils/tideDistributor";
import { floorTokenWei } from "@/utils/tideSwap";

export function useTideSwap() {
  const {
    address,
    isConnected,
    isImpersonating,
    walletAddress,
    walletConnected,
  } = useHarborAccount();
  const txModal = useTideTransaction();
  const { isWindowOpen: windowOpen } = useTideDistributorWindow();

  const [baoAmount, setBaoAmountState] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

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

  const { data: maxBaoCap } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "MAX_BAO",
    chainId: TIDE_CONFIG.chainId,
  });

  const balance = balanceRaw ?? 0n;
  const balanceFloorWei = useMemo(
    () => floorTokenWei(balance, TIDE_CONFIG.baoDecimals),
    [balance]
  );

  const setBaoAmount = useCallback((value: string) => {
    setBaoAmountState(value.replace(/[^\d]/g, ""));
  }, []);

  const maxBaoWei = useMemo(() => {
    if (isConnected && balanceFloorWei > 0n) return balanceFloorWei;
    return (maxBaoCap ?? 0n) as bigint;
  }, [isConnected, balanceFloorWei, maxBaoCap]);

  const { data: maxTideOutWei } = useReadContract({
    address: distributor,
    abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
    functionName: "baoToTide",
    args: [maxBaoWei],
    chainId: TIDE_CONFIG.chainId,
    query: { enabled: maxBaoWei > 0n },
  });

  const allowance = allowanceRaw ?? 0n;
  const balanceFormatted = formatToken(
    balanceFloorWei,
    TIDE_CONFIG.baoDecimals,
    0
  );
  const maxBaoAmount = balanceFormatted.replace(/,/g, "");

  const tideOut = (tideOutWei ?? 0n) as bigint;
  const minOut = (minTideOut ?? 0n) as bigint;

  const tideOutput = tideOutWei
    ? formatToken(
        floorTokenWei(tideOut, TIDE_CONFIG.tideDecimals),
        TIDE_CONFIG.tideDecimals,
        0
      )
    : "";

  const exceedsBalance = baoAmountWei > 0n && baoAmountWei > balanceFloorWei;
  const belowMinOut =
    baoAmountWei > 0n && tideOutWei !== undefined && minTideOut !== undefined && tideOut < minOut;

  const needsApproval = baoAmountWei > 0n && allowance < baoAmountWei;

  const canSwap =
    walletConnected &&
    !isImpersonating &&
    windowOpen &&
    baoAmountWei > 0n &&
    !exceedsBalance &&
    !belowMinOut &&
    !isSwapping;

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TIDE_CONFIG.chainId });

  const executeSwap = useCallback(async () => {
    if (!canSwap || !walletAddress) return;

    setSwapError(null);
    setIsSwapping(true);

    const steps = [];

    if (needsApproval) {
      steps.push({
        title: "Approve BAO",
        execute: () =>
          writeContractAsync({
            address: baoToken,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [distributor, baoAmountWei],
            chainId: TIDE_CONFIG.chainId,
          }),
      });
    }

    steps.push({
      title: "Swap BAO for TIDE",
      execute: () =>
        writeContractAsync({
          address: distributor,
          abi: HARBOR_TIDE_DISTRIBUTOR_ABI,
          functionName: "convertBao",
          args: [baoAmountWei],
          chainId: TIDE_CONFIG.chainId,
        }),
    });

    const result = await runHarborTransactionFlow({
      txModal,
      publicClient,
      parseError: parseTideClaimError,
      errorTitle: "Swap failed",
      successTitle: "Swap successful",
      successMessage: () => {
        const received = tideOutWei
          ? formatToken(
              floorTokenWei(tideOut, TIDE_CONFIG.tideDecimals),
              TIDE_CONFIG.tideDecimals,
              0
            )
          : tideOutput;
        return `You received ${received} TIDE in your wallet.`;
      },
      onComplete: async () => {
        await Promise.all([refetchAllowance(), refetchBalance()]);
        setBaoAmount("");
      },
      steps,
    });

    if (!result.ok) {
      setSwapError(result.message);
    }

    setIsSwapping(false);
  }, [
    canSwap,
    walletAddress,
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
    tideOutWei,
    txModal,
    setBaoAmount,
  ]);

  const swapRateLabel = "0.1758 TIDE per BAO";

  const maxSwapConversionLabel = useMemo(() => {
    if (maxBaoWei <= 0n || maxTideOutWei === undefined) return null;
    const baoLabel = formatToken(maxBaoWei, TIDE_CONFIG.baoDecimals, 0);
    const tideLabel = formatToken(
      floorTokenWei(maxTideOutWei as bigint, TIDE_CONFIG.tideDecimals),
      TIDE_CONFIG.tideDecimals,
      0
    );
    return `${baoLabel} BAO → ${tideLabel} TIDE`;
  }, [maxBaoWei, maxTideOutWei]);

  return {
    isConnected,
    balance,
    balanceFormatted,
    maxBaoAmount,
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
  };
}
