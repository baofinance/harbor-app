import {
  encodeAbiParameters,
  encodePacked,
  parseAbiParameters,
  type PublicClient,
} from "viem";
import { UNISWAP_V4_STATE_VIEW_ABI } from "@/abis/uniswapV4";
import {
  PERMIT2_ABI,
  UNIVERSAL_ROUTER_ABI,
  V4_QUOTER_ABI,
} from "@/abis/permit2";
import { ERC20_ABI } from "@/abis/shared";
import { TIDE_POL_SWAP_CONFIG } from "@/config/tidePolSwap";

const { poolKey, universalRouter, permit2, v4Quoter, stateView, slippagePct } =
  TIDE_POL_SWAP_CONFIG;

/** V4 periphery action bytes — SWAP, SETTLE_ALL, TAKE_ALL (flash-accounting order). */
const V4_ACTIONS = encodePacked(
  ["uint8", "uint8", "uint8"],
  [0x06, 0x0c, 0x0f]
);

const UNIVERSAL_ROUTER_V4_SWAP_COMMAND = "0x10" as `0x${string}`;

function applySlippage(amount: bigint, slippage: number): bigint {
  const bps = BigInt(Math.round(slippage * 100));
  return (amount * (10000n - bps)) / 10000n;
}

export function isTideToken(address: string): boolean {
  return address.toLowerCase() === TIDE_POL_SWAP_CONFIG.tideToken.toLowerCase();
}

export function isPolPairToken(address: string): boolean {
  return address.toLowerCase() === TIDE_POL_SWAP_CONFIG.pairToken.toLowerCase();
}

/** wstETH (currency0) → TIDE (currency1) on the POL v4 pool. */
export function getPolZeroForOne(inputToken: `0x${string}`): boolean {
  return inputToken.toLowerCase() === poolKey.currency0.toLowerCase();
}

export async function quoteWstEthToTide(
  publicClient: PublicClient,
  amountIn: bigint
): Promise<bigint | null> {
  if (amountIn <= 0n) return 0n;

  try {
    const { result } = await publicClient.simulateContract({
      address: v4Quoter,
      abi: V4_QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [poolKey, true, amountIn, "0x"],
    });
    const [amountOut] = result as [bigint, bigint];
    return amountOut > 0n ? amountOut : null;
  } catch {
    // Fall back to slot0 estimate when quoter reverts (RPC / liquidity edge cases).
  }

  try {
    const slot0 = (await publicClient.readContract({
      address: stateView,
      abi: UNISWAP_V4_STATE_VIEW_ABI,
      functionName: "getSlot0",
      args: [TIDE_POL_SWAP_CONFIG.poolId],
    })) as readonly [bigint, number, number, number];

    const sqrtPriceX96 = slot0[0];
    if (sqrtPriceX96 <= 0n) return null;

    const Q96 = 2n ** 96n;
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;
    const feeNumerator = 1_000_000n - BigInt(poolKey.fee);
    const amountInAfterFee = (amountIn * feeNumerator) / 1_000_000n;
    const estimatedOut = (amountInAfterFee * priceX192) / (Q96 * Q96);
    return estimatedOut > 0n ? estimatedOut : null;
  } catch {
    return null;
  }
}

export function buildWstEthToTideUniversalRouterTx(input: {
  amountIn: bigint;
  amountOutMinimum: bigint;
}): {
  to: `0x${string}`;
  commands: `0x${string}`;
  inputs: `0x${string}`[];
  deadline: bigint;
} {
  const amountIn128 = input.amountIn > (2n ** 128n - 1n)
    ? (2n ** 128n - 1n)
    : input.amountIn;
  const minOut128 = input.amountOutMinimum > (2n ** 128n - 1n)
    ? (2n ** 128n - 1n)
    : input.amountOutMinimum;

  const swapParams = encodeAbiParameters(
    parseAbiParameters(
      "((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 amountIn, uint128 amountOutMinimum, bytes hookData)"
    ),
    [
      {
        poolKey: {
          currency0: poolKey.currency0,
          currency1: poolKey.currency1,
          fee: poolKey.fee,
          tickSpacing: poolKey.tickSpacing,
          hooks: poolKey.hooks,
        },
        zeroForOne: true,
        amountIn: amountIn128,
        amountOutMinimum: minOut128,
        hookData: "0x",
      },
    ]
  );

  const settleParams = encodeAbiParameters(
    parseAbiParameters("address, uint256"),
    [poolKey.currency0, input.amountIn]
  );

  const takeParams = encodeAbiParameters(
    parseAbiParameters("address, uint256"),
    [poolKey.currency1, input.amountOutMinimum]
  );

  const v4Input = encodeAbiParameters(parseAbiParameters("bytes, bytes[]"), [
    V4_ACTIONS,
    [swapParams, settleParams, takeParams],
  ]);

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

  return {
    to: universalRouter,
    commands: UNIVERSAL_ROUTER_V4_SWAP_COMMAND,
    inputs: [v4Input],
    deadline,
  };
}

export async function ensurePermit2Allowance(input: {
  publicClient: PublicClient;
  owner: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  writeContractAsync: (...args: any[]) => Promise<`0x${string}`>;
  ensureErc20Allowance: (
    token: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => Promise<void>;
}): Promise<void> {
  const { publicClient, owner, token, amount, writeContractAsync, ensureErc20Allowance } =
    input;

  if (amount <= 0n) return;

  await ensureErc20Allowance(token, permit2, amount);

  const allowance = (await publicClient.readContract({
    address: permit2,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: [owner, token, universalRouter],
  })) as readonly [bigint, number, number];

  const [permitAmount, expiration] = allowance;
  const now = Math.floor(Date.now() / 1000);
  const maxPermit2Amount = (2n ** 160n - 1n) as bigint;
  if (permitAmount >= amount && expiration > now + 60) return;

  const newExpiration = now + 60 * 60 * 24 * 30;
  const hash = await writeContractAsync({
    address: permit2,
    abi: PERMIT2_ABI,
    functionName: "approve",
    args: [token, universalRouter, maxPermit2Amount, newExpiration],
    chainId: TIDE_POL_SWAP_CONFIG.chainId,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

export async function swapWstEthToTideViaPolPool(input: {
  publicClient: PublicClient;
  owner: `0x${string}`;
  amountIn: bigint;
  writeContractAsync: (...args: any[]) => Promise<`0x${string}`>;
  ensureErc20Allowance: (
    token: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => Promise<void>;
}): Promise<`0x${string}`> {
  const {
    publicClient,
    owner,
    amountIn,
    writeContractAsync,
    ensureErc20Allowance,
  } = input;

  if (amountIn <= 0n) {
    throw new Error("Nothing to swap through the TIDE POL pool.");
  }

  const quotedOut = await quoteWstEthToTide(publicClient, amountIn);
  const amountOutMinimum =
    quotedOut != null
      ? applySlippage(quotedOut, slippagePct)
      : 0n;

  await ensurePermit2Allowance({
    publicClient,
    owner,
    token: poolKey.currency0,
    amount: amountIn,
    writeContractAsync,
    ensureErc20Allowance,
  });

  const tx = buildWstEthToTideUniversalRouterTx({
    amountIn,
    amountOutMinimum,
  });

  const hash = await writeContractAsync({
    address: tx.to,
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: "execute",
    args: [tx.commands, tx.inputs, tx.deadline],
    chainId: TIDE_POL_SWAP_CONFIG.chainId,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function readErc20Balance(
  publicClient: PublicClient,
  token: `0x${string}`,
  owner: `0x${string}`
): Promise<bigint> {
  const bal = (await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [owner],
  })) as bigint;
  return bal ?? 0n;
}

export function formatTideSwapRateLabel(): string {
  return `TIDE via Uniswap v4 POL pool (wstETH / TIDE)`;
}
