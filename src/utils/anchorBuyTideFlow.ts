import type { PublicClient } from "viem";
import { rewardsABI } from "@/abis/rewards";
import { ERC20_ABI } from "@/abis/shared";
import { TIDE_POL_SWAP_CONFIG } from "@/config/tidePolSwap";
import type { TransactionStep } from "@/components/TransactionProgressModal";
import {
  fetchTokenDecimals,
  tryGetParaswapSwapTx,
} from "@/hooks/useDefiLlamaSwap";
import type { AnchorMarketTuple } from "@/types/anchor";
import {
  isPolPairToken,
  isTideToken,
  swapWstEthToTideViaPolPool,
} from "@/utils/uniswapV4TideSwap";

const { paraswapTransferProxy, pairToken, tideToken, slippagePct } =
  TIDE_POL_SWAP_CONFIG;

export type AnchorBuyTidePoolSelection = {
  marketId: string;
  poolType: "collateral" | "sail";
};

export type AnchorRewardToken = {
  address: string;
  symbol: string;
  claimable: bigint;
};

export type RunAnchorBuyTideFlowParams = {
  address: `0x${string}`;
  publicClient: PublicClient;
  anchorMarkets: AnchorMarketTuple[];
  selectedPools: AnchorBuyTidePoolSelection[];
  getPoolRewardTokens: (poolAddress: `0x${string}`) => AnchorRewardToken[];
  writeContractAsync: (...args: any[]) => Promise<`0x${string}`>;
  sendTransactionAsync: (...args: any[]) => Promise<`0x${string}`>;
  ensureAllowance: (
    token: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => Promise<void>;
  setTransactionProgress: (progress: {
    isOpen: boolean;
    title: string;
    steps: TransactionStep[];
    currentStepIndex: number;
  }) => void;
  updateProgressStep: (
    stepId: string,
    update: Partial<TransactionStep>
  ) => void;
  setCurrentStep: (index: number) => void;
  isUserRejection: (error: unknown) => boolean;
};

function asAddress(value: string): `0x${string}` {
  return value as `0x${string}`;
}

function getPoolAddress(
  market: Record<string, unknown>,
  poolType: "collateral" | "sail"
): `0x${string}` | undefined {
  const addresses = (market as { addresses?: Record<string, `0x${string}`> })
    .addresses;
  return poolType === "collateral"
    ? addresses?.stabilityPoolCollateral
    : addresses?.stabilityPoolLeveraged;
}

function aggregateRewardTokens(
  selectedPools: AnchorBuyTidePoolSelection[],
  anchorMarkets: AnchorMarketTuple[],
  getPoolRewardTokens: (poolAddress: `0x${string}`) => AnchorRewardToken[]
): Map<string, AnchorRewardToken> {
  const tokens = new Map<string, AnchorRewardToken>();

  for (const { marketId, poolType } of selectedPools) {
    const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
    if (!market) continue;

    const poolAddress = getPoolAddress(market as Record<string, unknown>, poolType);
    if (!poolAddress) continue;

    for (const token of getPoolRewardTokens(poolAddress)) {
      if (token.claimable <= 0n) continue;
      const key = token.address.toLowerCase();
      const existing = tokens.get(key);
      if (existing) {
        tokens.set(key, {
          ...existing,
          claimable: existing.claimable + token.claimable,
        });
      } else {
        tokens.set(key, { ...token });
      }
    }
  }

  return tokens;
}

function poolsWithRewards(
  selectedPools: AnchorBuyTidePoolSelection[],
  anchorMarkets: AnchorMarketTuple[],
  getPoolRewardTokens: (poolAddress: `0x${string}`) => AnchorRewardToken[]
): AnchorBuyTidePoolSelection[] {
  return selectedPools.filter(({ marketId, poolType }) => {
    const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
    if (!market) return false;
    const poolAddress = getPoolAddress(market as Record<string, unknown>, poolType);
    if (!poolAddress) return false;
    return getPoolRewardTokens(poolAddress).some((t) => t.claimable > 0n);
  });
}

async function readBalanceDelta(
  publicClient: PublicClient,
  token: `0x${string}`,
  owner: `0x${string}`,
  before: bigint
): Promise<bigint> {
  const after = (await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [owner],
  })) as bigint;
  return after > before ? after - before : 0n;
}

function paraswapRouteHint(fromToken: string): string {
  const src = fromToken.toLowerCase();
  const mid = pairToken.toLowerCase();
  const dest = tideToken.toLowerCase();
  if (src === mid) return `${mid}-${dest}`;
  return `${src}-${mid}-${dest}`;
}

async function executeParaswapSwap(input: {
  fromToken: `0x${string}`;
  amount: bigint;
  decimals: number;
  destToken: `0x${string}`;
  destDecimals: number;
  address: `0x${string}`;
  routeHint: string;
  ensureAllowance: RunAnchorBuyTideFlowParams["ensureAllowance"];
  sendTransactionAsync: RunAnchorBuyTideFlowParams["sendTransactionAsync"];
  publicClient: PublicClient;
}): Promise<`0x${string}`> {
  const swapTx = await tryGetParaswapSwapTx(
    input.fromToken,
    input.destToken,
    input.amount,
    input.address,
    slippagePct,
    input.decimals,
    input.destDecimals,
    { route: input.routeHint }
  );

  if (!swapTx) {
    throw new Error("Velora route unavailable");
  }

  await input.ensureAllowance(
    input.fromToken,
    paraswapTransferProxy,
    input.amount
  );

  await new Promise((resolve) => setTimeout(resolve, 500));

  const hash = await input.sendTransactionAsync({
    to: swapTx.to,
    data: swapTx.data,
    value: swapTx.value,
    account: input.address,
  });

  await input.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function runAnchorBuyTideFlow(
  params: RunAnchorBuyTideFlowParams
): Promise<{ ok: boolean; error?: string }> {
  const {
    address,
    publicClient,
    anchorMarkets,
    selectedPools,
    getPoolRewardTokens,
    writeContractAsync,
    sendTransactionAsync,
    ensureAllowance,
    setTransactionProgress,
    updateProgressStep,
    setCurrentStep,
    isUserRejection,
  } = params;

  const poolsToClaim = poolsWithRewards(
    selectedPools,
    anchorMarkets,
    getPoolRewardTokens
  );

  if (poolsToClaim.length === 0) {
    return { ok: false, error: "No claimable rewards in the selected pools." };
  }

  const rewardTokens = aggregateRewardTokens(
    poolsToClaim,
    anchorMarkets,
    getPoolRewardTokens
  );

  const swapTokens = [...rewardTokens.values()].filter(
    (t) => !isTideToken(t.address)
  );

  const needsPolSwap = swapTokens.some((t) => !isTideToken(t.address));

  const claimSteps: TransactionStep[] = poolsToClaim.map(
    ({ marketId, poolType }) => {
      const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
      const marketSymbol =
        (market as { peggedToken?: { symbol?: string } })?.peggedToken
          ?.symbol || marketId;
      return {
        id: `claim-${marketId}-${poolType}`,
        label: `Claim rewards from ${marketSymbol} ${poolType} pool`,
        status: "pending" as const,
      };
    }
  );

  const swapSteps: TransactionStep[] = swapTokens
    .filter((t) => !isPolPairToken(t.address))
    .map((token) => ({
      id: `swap-${token.address.toLowerCase()}`,
      label: `Swap ${token.symbol} for TIDE`,
      status: "pending" as const,
    }));

  const polStep: TransactionStep | null = needsPolSwap
    ? {
        id: "pol-tide",
        label: "Swap wstETH for TIDE",
        status: "pending",
      }
    : null;

  const steps = [...claimSteps, ...swapSteps, ...(polStep ? [polStep] : [])];

  setTransactionProgress({
    isOpen: true,
    title: "Buy TIDE with Rewards",
    steps,
    currentStepIndex: 0,
  });

  const balanceBefore = new Map<string, bigint>();
  for (const token of rewardTokens.values()) {
    const bal = (await publicClient.readContract({
      address: asAddress(token.address),
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;
    balanceBefore.set(token.address.toLowerCase(), bal ?? 0n);
  }

  const wstEthBefore =
    balanceBefore.get(pairToken.toLowerCase()) ??
    (await publicClient.readContract({
      address: pairToken,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }));

  let stepIndex = 0;

  try {
    for (const { marketId, poolType } of poolsToClaim) {
      const stepId = `claim-${marketId}-${poolType}`;
      setCurrentStep(stepIndex);
      updateProgressStep(stepId, { status: "in_progress" });

      const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
      const poolAddress = market
        ? getPoolAddress(market as Record<string, unknown>, poolType)
        : undefined;

      if (!poolAddress) {
        updateProgressStep(stepId, {
          status: "error",
          error: "Pool address not found",
        });
        return { ok: false, error: "Pool address not found" };
      }

      const hash = await writeContractAsync({
        address: poolAddress,
        abi: rewardsABI,
        functionName: "claim",
      });

      updateProgressStep(stepId, {
        status: "in_progress",
        txHash: hash as string,
        details: "Waiting for confirmation…",
      });

      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });

      updateProgressStep(stepId, {
        status: "completed",
        txHash: hash as string,
      });
      stepIndex++;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    for (const token of swapTokens.filter((t) => !isPolPairToken(t.address))) {
      const stepId = `swap-${token.address.toLowerCase()}`;
      setCurrentStep(stepIndex);
      updateProgressStep(stepId, { status: "in_progress" });

      const tokenKey = token.address.toLowerCase();
      const before = balanceBefore.get(tokenKey) ?? 0n;
      const swapAmount = await readBalanceDelta(
        publicClient,
        asAddress(token.address),
        address,
        before
      );

      if (swapAmount <= 0n) {
        updateProgressStep(stepId, {
          status: "completed",
          details: "No balance to swap",
        });
        stepIndex++;
        continue;
      }

      const decimals = await fetchTokenDecimals(
        asAddress(token.address),
        publicClient
      );
      const routeHint = paraswapRouteHint(token.address);

      updateProgressStep(stepId, {
        details: "Finding Velora route to TIDE…",
      });

      try {
        const directHash = await executeParaswapSwap({
          fromToken: asAddress(token.address),
          amount: swapAmount,
          decimals,
          destToken: tideToken,
          destDecimals: 18,
          address,
          routeHint,
          ensureAllowance,
          sendTransactionAsync,
          publicClient,
        });

        updateProgressStep(stepId, {
          status: "completed",
          txHash: directHash as string,
          details: "Routed to TIDE via Velora",
        });
      } catch (directError) {
        if (isUserRejection(directError)) throw directError;

        updateProgressStep(stepId, {
          details: "Direct TIDE route unavailable — swapping to wstETH…",
        });

        const wstEthHash = await executeParaswapSwap({
          fromToken: asAddress(token.address),
          amount: swapAmount,
          decimals,
          destToken: pairToken,
          destDecimals: 18,
          address,
          routeHint: `${token.address.toLowerCase()}-${pairToken.toLowerCase()}`,
          ensureAllowance,
          sendTransactionAsync,
          publicClient,
        });

        updateProgressStep(stepId, {
          status: "completed",
          txHash: wstEthHash as string,
          details: "Swapped to wstETH — final TIDE leg via POL pool next",
        });
      }

      stepIndex++;
    }

    if (polStep) {
      setCurrentStep(stepIndex);
      updateProgressStep("pol-tide", { status: "in_progress" });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const wstEthToSwap = await readBalanceDelta(
        publicClient,
        pairToken,
        address,
        wstEthBefore
      );

      if (wstEthToSwap <= 0n) {
        updateProgressStep("pol-tide", {
          status: "completed",
          details: "TIDE already received via Velora",
        });
        return { ok: true };
      }

      updateProgressStep("pol-tide", {
        details: "Trying Velora wstETH → TIDE route…",
      });

      try {
        const veloraHash = await executeParaswapSwap({
          fromToken: pairToken,
          amount: wstEthToSwap,
          decimals: 18,
          destToken: tideToken,
          destDecimals: 18,
          address,
          routeHint: paraswapRouteHint(pairToken),
          ensureAllowance,
          sendTransactionAsync,
          publicClient,
        });

        updateProgressStep("pol-tide", {
          status: "completed",
          txHash: veloraHash as string,
          details: "Routed to TIDE via Velora",
        });
      } catch (polError) {
        if (isUserRejection(polError)) throw polError;

        updateProgressStep("pol-tide", {
          details: "Velora unavailable — swapping via Uniswap v4 POL pool…",
        });

        const polHash = await swapWstEthToTideViaPolPool({
          publicClient,
          owner: address,
          amountIn: wstEthToSwap,
          writeContractAsync,
          ensureErc20Allowance: ensureAllowance,
        });

        updateProgressStep("pol-tide", {
          status: "completed",
          txHash: polHash as string,
          details: "Routed via Uniswap v4 POL pool",
        });
      }
    }

    return { ok: true };
  } catch (error: unknown) {
    const message = isUserRejection(error)
      ? "Transaction was rejected in your wallet."
      : error instanceof Error
        ? error.message
        : "Transaction failed. Please try again.";

    const activeStep = steps[stepIndex];
    if (activeStep) {
      updateProgressStep(activeStep.id, {
        status: "error",
        error: message,
      });
    }

    return { ok: false, error: message };
  }
}
