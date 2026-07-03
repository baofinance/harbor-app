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

export type BuyTideFlowSource = "all" | "market";

export type BuyTideResumeState = {
  source: BuyTideFlowSource;
  selectedPools: AnchorBuyTidePoolSelection[];
  steps: TransactionStep[];
  stepIndex: number;
  balanceBefore: Record<string, string>;
  wstEthBefore: string;
  poolsToClaim: AnchorBuyTidePoolSelection[];
  swapTokens: AnchorRewardToken[];
  needsPolSwap: boolean;
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
  resume?: BuyTideResumeState;
  flowSource?: BuyTideFlowSource;
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

function parseClaimStepId(stepId: string): {
  marketId: string;
  poolType: "collateral" | "sail";
} | null {
  if (!stepId.startsWith("claim-")) return null;
  const rest = stepId.slice("claim-".length);
  const poolTypeSep = rest.lastIndexOf("-");
  if (poolTypeSep <= 0) return null;
  const poolType = rest.slice(poolTypeSep + 1);
  if (poolType !== "collateral" && poolType !== "sail") return null;
  return {
    marketId: rest.slice(0, poolTypeSep),
    poolType,
  };
}

function formatBuyTideFlowError(
  error: unknown,
  isUserRejection: (error: unknown) => boolean
): string {
  if (isUserRejection(error)) {
    return "Transaction was rejected in your wallet.";
  }

  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  const lower = message.toLowerCase();

  if (
    lower.includes("route unavailable") ||
    lower.includes("could not find a swap route")
  ) {
    return message;
  }

  if (
    lower.includes("revert") ||
    lower.includes("execution reverted") ||
    lower.includes("transaction failed")
  ) {
    return "The transaction failed on-chain. Please try again.";
  }

  return message || "Something went wrong. Please try again.";
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

function buildResumeState(input: {
  source: BuyTideFlowSource;
  selectedPools: AnchorBuyTidePoolSelection[];
  steps: TransactionStep[];
  stepIndex: number;
  balanceBefore: Map<string, bigint>;
  wstEthBefore: bigint;
  poolsToClaim: AnchorBuyTidePoolSelection[];
  swapTokens: AnchorRewardToken[];
  needsPolSwap: boolean;
}): BuyTideResumeState {
  return {
    source: input.source,
    selectedPools: input.selectedPools,
    steps: input.steps,
    stepIndex: input.stepIndex,
    balanceBefore: Object.fromEntries(
      [...input.balanceBefore.entries()].map(([key, value]) => [
        key,
        value.toString(),
      ])
    ),
    wstEthBefore: input.wstEthBefore.toString(),
    poolsToClaim: input.poolsToClaim,
    swapTokens: input.swapTokens,
    needsPolSwap: input.needsPolSwap,
  };
}

export async function runAnchorBuyTideFlow(
  params: RunAnchorBuyTideFlowParams
): Promise<{ ok: boolean; error?: string; resumeState?: BuyTideResumeState }> {
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
    resume,
    flowSource = "all",
  } = params;

  let steps: TransactionStep[];
  let stepIndex: number;
  let balanceBefore: Map<string, bigint>;
  let wstEthBefore: bigint;
  let poolsToClaim: AnchorBuyTidePoolSelection[];
  let swapTokens: AnchorRewardToken[];
  let needsPolSwap: boolean;

  if (resume) {
    steps = resume.steps.map((step, index) =>
      index >= resume.stepIndex
        ? {
            ...step,
            status: "pending" as const,
            error: undefined,
            txHash: undefined,
            details: undefined,
          }
        : step
    );
    stepIndex = resume.stepIndex;
    balanceBefore = new Map(
      Object.entries(resume.balanceBefore).map(([key, value]) => [
        key,
        BigInt(value),
      ])
    );
    wstEthBefore = BigInt(resume.wstEthBefore);
    poolsToClaim = resume.poolsToClaim;
    swapTokens = resume.swapTokens;
    needsPolSwap = resume.needsPolSwap;

    setTransactionProgress({
      isOpen: true,
      title: "Buy TIDE with Rewards",
      steps,
      currentStepIndex: stepIndex,
    });
  } else {
    poolsToClaim = poolsWithRewards(
      selectedPools,
      anchorMarkets,
      getPoolRewardTokens
    );

    if (poolsToClaim.length === 0) {
      return {
        ok: false,
        error: "No claimable rewards in the selected pools.",
      };
    }

    const rewardTokens = aggregateRewardTokens(
      poolsToClaim,
      anchorMarkets,
      getPoolRewardTokens
    );

    swapTokens = [...rewardTokens.values()].filter(
      (t) => !isTideToken(t.address)
    );

    needsPolSwap = swapTokens.some((t) => !isTideToken(t.address));

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

    steps = [...claimSteps, ...swapSteps, ...(polStep ? [polStep] : [])];

    setTransactionProgress({
      isOpen: true,
      title: "Buy TIDE with Rewards",
      steps,
      currentStepIndex: 0,
    });

    balanceBefore = new Map<string, bigint>();
    for (const token of rewardTokens.values()) {
      const bal = (await publicClient.readContract({
        address: asAddress(token.address),
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      balanceBefore.set(token.address.toLowerCase(), bal ?? 0n);
    }

    wstEthBefore =
      balanceBefore.get(pairToken.toLowerCase()) ??
      ((await publicClient.readContract({
        address: pairToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint);

    stepIndex = 0;
  }

  const makeResumeState = (): BuyTideResumeState =>
    buildResumeState({
      source: resume?.source ?? flowSource,
      selectedPools: resume?.selectedPools ?? selectedPools,
      steps,
      stepIndex,
      balanceBefore,
      wstEthBefore,
      poolsToClaim,
      swapTokens,
      needsPolSwap,
    });

  const swapTokenByAddress = new Map(
    swapTokens.map((token) => [token.address.toLowerCase(), token])
  );

  try {
    for (; stepIndex < steps.length; stepIndex++) {
      const step = steps[stepIndex];
      setCurrentStep(stepIndex);
      updateProgressStep(step.id, { status: "in_progress" });

      if (step.id.startsWith("claim-")) {
        const parsed = parseClaimStepId(step.id);
        if (!parsed) {
          updateProgressStep(step.id, {
            status: "error",
            error: "Invalid claim step",
          });
          return { ok: false, error: "Invalid claim step", resumeState: makeResumeState() };
        }

        const market = anchorMarkets.find(
          ([id]) => id === parsed.marketId
        )?.[1];
        const poolAddress = market
          ? getPoolAddress(market as Record<string, unknown>, parsed.poolType)
          : undefined;

        if (!poolAddress) {
          updateProgressStep(step.id, {
            status: "error",
            error: "Pool address not found",
          });
          return {
            ok: false,
            error: "Pool address not found",
            resumeState: makeResumeState(),
          };
        }

        const hash = await writeContractAsync({
          address: poolAddress,
          abi: rewardsABI,
          functionName: "claim",
        });

        updateProgressStep(step.id, {
          status: "in_progress",
          txHash: hash as string,
          details: "Waiting for confirmation…",
        });

        await publicClient.waitForTransactionReceipt({
          hash: hash as `0x${string}`,
        });

        updateProgressStep(step.id, {
          status: "completed",
          txHash: hash as string,
        });
        continue;
      }

      if (step.id.startsWith("swap-")) {
        if (stepIndex === steps.findIndex((s) => s.id.startsWith("swap-"))) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const tokenKey = step.id.slice("swap-".length);
        const token = swapTokenByAddress.get(tokenKey);
        if (!token) {
          updateProgressStep(step.id, {
            status: "error",
            error: "Reward token not found",
          });
          return {
            ok: false,
            error: "Reward token not found",
            resumeState: makeResumeState(),
          };
        }

        const before = balanceBefore.get(tokenKey) ?? 0n;
        const swapAmount = await readBalanceDelta(
          publicClient,
          asAddress(token.address),
          address,
          before
        );

        if (swapAmount <= 0n) {
          updateProgressStep(step.id, {
            status: "completed",
            details: "No balance to swap",
          });
          continue;
        }

        const decimals = await fetchTokenDecimals(
          asAddress(token.address),
          publicClient
        );
        const routeHint = paraswapRouteHint(token.address);

        updateProgressStep(step.id, {
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

          updateProgressStep(step.id, {
            status: "completed",
            txHash: directHash as string,
            details: "Routed to TIDE via Velora",
          });
        } catch (directError) {
          if (isUserRejection(directError)) throw directError;

          updateProgressStep(step.id, {
            details: "Direct TIDE route unavailable — swapping to wstETH…",
          });

          try {
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

            updateProgressStep(step.id, {
              status: "completed",
              txHash: wstEthHash as string,
              details: "Swapped to wstETH — final TIDE leg via POL pool next",
            });
          } catch (fallbackError) {
            if (isUserRejection(fallbackError)) throw fallbackError;

            throw new Error(
              `Could not find a swap route for ${token.symbol}. Your tokens are still in your wallet.`
            );
          }
        }

        continue;
      }

      if (step.id === "pol-tide") {
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
    }

    return { ok: true };
  } catch (error: unknown) {
    const message = formatBuyTideFlowError(error, isUserRejection);

    const activeStep = steps[stepIndex];
    if (activeStep) {
      updateProgressStep(activeStep.id, {
        status: "error",
        error: message,
      });
    }

    return { ok: false, error: message, resumeState: makeResumeState() };
  }
}
