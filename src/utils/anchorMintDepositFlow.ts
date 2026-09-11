/**
 * Anchor mint / stability-pool deposit progress + zap fallback helpers.
 */

import type { Abi, Hash, PublicClient } from "viem";

export type ProgressConfigPatch = ReturnType<typeof separatePoolProgressPatch>;

export type DepositMintedPeggedToPoolInput = {
  publicClient: PublicClient | undefined;
  writeContractAsync: (args: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args: readonly unknown[];
  }) => Promise<Hash>;
  peggedTokenAddress: `0x${string}`;
  stabilityPoolAddress: `0x${string}`;
  userAddress: `0x${string}`;
  balanceBeforeMint?: bigint;
  erc20Abi: Abi;
  stabilityPoolAbi: Abi;
  onApprovingPegged?: () => void;
  onDepositing?: () => void;
  onApproveTx?: (hash: Hash) => void;
  onDepositTx?: (hash: Hash) => void;
  /** Delay after mint before reading minted balance (ms). Default 2000. */
  balanceSettleMs?: number;
};

/** Mint-only path: approve ha token (if needed) and deposit to stability pool. */
export async function depositMintedPeggedToStabilityPool(
  input: DepositMintedPeggedToPoolInput,
): Promise<void> {
  const {
    publicClient,
    writeContractAsync,
    peggedTokenAddress,
    stabilityPoolAddress,
    userAddress,
    balanceBeforeMint,
    erc20Abi,
    stabilityPoolAbi,
    onApprovingPegged,
    onDepositing,
    onApproveTx,
    onDepositTx,
    balanceSettleMs = 2000,
  } = input;

  if (balanceSettleMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, balanceSettleMs));
  }

  const balanceAfterMint = (await publicClient?.readContract({
    address: peggedTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  })) as bigint;

  const minted =
    balanceBeforeMint !== undefined
      ? balanceAfterMint - balanceBeforeMint
      : balanceAfterMint;
  const depositAmount = minted > 0n ? minted : balanceAfterMint;

  if (depositAmount <= 0n) {
    throw new Error(
      "Mint succeeded but could not determine minted amount to deposit.",
    );
  }

  const currentAllowance = (await publicClient?.readContract({
    address: peggedTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [userAddress, stabilityPoolAddress],
  })) as bigint;

  if (currentAllowance < depositAmount) {
    onApprovingPegged?.();
    const approveHash = await writeContractAsync({
      address: peggedTokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [stabilityPoolAddress, depositAmount],
    });
    onApproveTx?.(approveHash);
    await publicClient?.waitForTransactionReceipt({ hash: approveHash });
  }

  onDepositing?.();
  const depositHash = await writeContractAsync({
    address: stabilityPoolAddress,
    abi: stabilityPoolAbi,
    functionName: "deposit",
    args: [depositAmount, userAddress, 0n],
  });
  onDepositTx?.(depositHash);
  await publicClient?.waitForTransactionReceipt({ hash: depositHash });
}

export function isTxUserRejection(err: unknown): boolean {
  const errAny = err as { message?: string; code?: number; name?: string };
  const errMsg = (errAny?.message ?? "").toLowerCase();
  const errName = (errAny?.name ?? "").toLowerCase();
  const errCode = errAny?.code;
  return (
    errName.includes("userrejected") ||
    errMsg.includes("user rejected") ||
    errMsg.includes("user denied") ||
    errMsg.includes("rejected the request") ||
    errMsg.includes("denied request") ||
    errCode === 4001 ||
    errCode === 4900
  );
}

export type CollateralMintProgressInput = {
  shouldDepositToPool: boolean;
  permitEligible: boolean;
  needsZapApproval: boolean;
  needsDirectApproval: boolean;
  useZap: boolean;
  zapAssetName: string | null;
  wrappedZapAssetName: string | null;
  /** Wrapped collateral (wstETH/fxSAVE) one-tx zap → stability pool. */
  useZapWrappedToPoolAndDeposit?: boolean;
  /**
   * One-tx minter zap → stability pool is planned (USDC/fxUSD/ETH/stETH/wstETH/fxSAVE).
   * When false but `shouldDepositToPool`, UI shows separate mint + pool deposit steps.
   */
  useCombinedPoolZap?: boolean;
};

/** Progress steps for mint-only or full stability-pool path. */
export function buildCollateralMintProgressFields(
  input: CollateralMintProgressInput,
): {
  includePermitCollateral: boolean;
  includeApproveCollateral: boolean;
  includeMint: boolean;
  includeApprovePegged: boolean;
  includeDeposit: boolean;
  useZap: boolean;
  zapAsset: string | null;
  zapAndDeposit: boolean;
  wrappedZapAndDeposit: boolean;
  wrappedZapAsset: string | null;
  title: string;
} {
  const {
    shouldDepositToPool,
    permitEligible,
    needsZapApproval,
    needsDirectApproval,
    useZap,
    zapAssetName,
    wrappedZapAssetName,
    useZapWrappedToPoolAndDeposit = false,
    useCombinedPoolZap = false,
  } = input;

  const includeApproveCollateral =
    (needsZapApproval || needsDirectApproval) && !permitEligible;

  const combinedWrappedPoolZap =
    shouldDepositToPool &&
    useCombinedPoolZap &&
    useZapWrappedToPoolAndDeposit &&
    !!wrappedZapAssetName;
  const combinedZapPoolZap =
    shouldDepositToPool && useCombinedPoolZap && useZap && !!zapAssetName;

  if (shouldDepositToPool && (combinedZapPoolZap || combinedWrappedPoolZap)) {
    return {
      includePermitCollateral: permitEligible,
      includeApproveCollateral,
      includeMint: true,
      includeApprovePegged: false,
      includeDeposit: false,
      useZap,
      zapAsset: zapAssetName,
      zapAndDeposit: combinedZapPoolZap,
      wrappedZapAndDeposit: combinedWrappedPoolZap,
      wrappedZapAsset: wrappedZapAssetName,
      title: "Mint anchor token & Deposit",
    };
  }

  if (shouldDepositToPool) {
    return {
      includePermitCollateral: permitEligible,
      includeApproveCollateral,
      includeMint: true,
      includeApprovePegged: true,
      includeDeposit: true,
      useZap,
      zapAsset: zapAssetName,
      zapAndDeposit: false,
      wrappedZapAndDeposit: false,
      wrappedZapAsset: wrappedZapAssetName,
      title: "Mint anchor token & Deposit",
    };
  }

  return {
    includePermitCollateral: permitEligible,
    includeApproveCollateral,
    includeMint: true,
    includeApprovePegged: false,
    includeDeposit: false,
    useZap,
    zapAsset: zapAssetName,
    zapAndDeposit: false,
    wrappedZapAndDeposit: false,
    wrappedZapAsset: null,
    title: "Mint anchor token",
  };
}

/** Permit failed — switch to approve while keeping a 2-step combined pool zap UI. */
export function permitToApproveCombinedPoolPatch(options: {
  needsApproval: boolean;
  combinedPoolZap: boolean;
}): {
  includePermitCollateral: boolean;
  includeApproveCollateral: boolean;
  zapAndDeposit: boolean;
  wrappedZapAndDeposit: boolean;
  includeApprovePegged: boolean;
  includeDeposit: boolean;
} {
  if (options.combinedPoolZap) {
    return {
      includePermitCollateral: false,
      includeApproveCollateral: options.needsApproval,
      zapAndDeposit: true,
      wrappedZapAndDeposit: true,
      includeApprovePegged: false,
      includeDeposit: false,
    };
  }
  return {
    includePermitCollateral: false,
    includeApproveCollateral: options.needsApproval,
    zapAndDeposit: false,
    wrappedZapAndDeposit: false,
    includeApprovePegged: true,
    includeDeposit: true,
  };
}

/**
 * Combined zap → pool failed — expand to mint-only zap then approve ha + deposit.
 * Collateral permit/approve is already done at this point.
 */
export function separatePoolProgressPatch(): {
  includePermitCollateral: boolean;
  includeApproveCollateral: boolean;
  zapAndDeposit: boolean;
  wrappedZapAndDeposit: boolean;
  includeMint: boolean;
  includeApprovePegged: boolean;
  includeDeposit: boolean;
  title: string;
} {
  return {
    includePermitCollateral: false,
    includeApproveCollateral: false,
    zapAndDeposit: false,
    wrappedZapAndDeposit: false,
    includeMint: true,
    includeApprovePegged: true,
    includeDeposit: true,
    title: "Mint anchor token & Deposit",
  };
}

/**
 * Run a combined zap-to-pool tx; on contract/RPC failure (not user reject) return null
 * so the caller can fall back to separate mint + deposit steps.
 */
export async function attemptCombinedPoolZap<T>(options: {
  execute: () => Promise<T>;
  onFallback: () => void;
  logLabel?: string;
}): Promise<T | null> {
  try {
    return await options.execute();
  } catch (err) {
    if (isTxUserRejection(err)) throw err;
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[anchorMint] ${options.logLabel ?? "Combined pool zap"} failed — falling back to separate transactions:`,
        err,
      );
    }
    options.onFallback();
    return null;
  }
}
