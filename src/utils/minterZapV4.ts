import type { PublicClient } from "viem";

/**
 * Harbor IWrappedPriceOracle: wrappedRate (18 decimals) is **underlying per 1 wrapped**
 * (e.g. stETH per wstETH, fxUSD per fxSAVE). Then:
 * `wrappedOut = underlyingAmount * 1e18 / wrappedRate`.
 *
 * For a conservative floor on wrapped output, pass **`maxWrappedRate`** from the oracle
 * (higher rate ⇒ fewer wrapped tokens per unit underlying ⇒ lower `minWrappedCollateralOut`).
 * That matches `useCollateralPrice().maxRate` and `market.wrappedRate` from anchor market data.
 */
export function expectedWrappedFromUnderlying(
  underlyingAmountWei: bigint,
  wrappedRate18: bigint
): bigint {
  if (wrappedRate18 <= 0n) return 0n;
  return (underlyingAmountWei * 10n ** 18n) / wrappedRate18;
}

/** Default 2% haircut on expected wrapped output after maxWrappedRate conversion. */
export const DEFAULT_WRAP_LEG_SLIPPAGE_BPS = 200n;

/**
 * `minWrappedCollateralOut` for zaps that first wrap/swap to wrapped collateral (wstETH, fxSAVE).
 * Uses oracle conversion when `wrappedRate18` is set; otherwise falls back to flat % of input (legacy).
 */
export function minWrappedCollateralAfterUnderlyingToWrapped(
  underlyingAmountWei: bigint,
  wrappedRate18: bigint | undefined,
  slipBps: bigint = DEFAULT_WRAP_LEG_SLIPPAGE_BPS
): bigint {
  if (slipBps >= 10000n) slipBps = DEFAULT_WRAP_LEG_SLIPPAGE_BPS;
  if (wrappedRate18 && wrappedRate18 > 0n) {
    const expected = expectedWrappedFromUnderlying(
      underlyingAmountWei,
      wrappedRate18
    );
    return (expected * (10000n - slipBps)) / 10000n;
  }
  return (underlyingAmountWei * (10000n - slipBps)) / 10000n;
}

/** Minimal ABI for ETH zap on-chain preview of wrapped out from native ETH amount. */
export const MINTER_ZAP_PREVIEW_WRAPPED_FROM_BASE_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "baseAssetAmount", type: "uint256" },
    ],
    name: "previewWrappedCollateralFromBase",
    outputs: [
      {
        internalType: "uint256",
        name: "wrappedCollateralAmount",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Native ETH → wrapped: prefer zap `previewWrappedCollateralFromBase`, then
 * ETH≈stETH × oracle wrap rate as fallback.
 */
export async function minWrappedCollateralForEthBaseZap(
  publicClient: Pick<PublicClient, "readContract"> | undefined,
  zapAddress: `0x${string}` | undefined,
  ethAmountWei: bigint,
  wrappedRate18: bigint | undefined,
  slipBps: bigint = DEFAULT_WRAP_LEG_SLIPPAGE_BPS
): Promise<bigint> {
  if (slipBps >= 10000n) slipBps = DEFAULT_WRAP_LEG_SLIPPAGE_BPS;
  if (publicClient && zapAddress) {
    try {
      const preview = (await publicClient.readContract({
        address: zapAddress,
        abi: MINTER_ZAP_PREVIEW_WRAPPED_FROM_BASE_ABI,
        functionName: "previewWrappedCollateralFromBase",
        args: [ethAmountWei],
      })) as bigint;
      if (preview > 0n) {
        return (preview * (10000n - slipBps)) / 10000n;
      }
    } catch {
      // fall through
    }
  }
  return minWrappedCollateralAfterUnderlyingToWrapped(
    ethAmountWei,
    wrappedRate18,
    slipBps
  );
}

/** @deprecated Prefer `minWrappedCollateralAfterUnderlyingToWrapped` (uses oracle conversion). */
export function minWrappedCollateralOutFromInput(
  amount: bigint,
  slipPercent: bigint = 1n
): bigint {
  if (slipPercent <= 0n || slipPercent >= 100n) {
    return (amount * 99n) / 100n;
  }
  return (amount * (100n - slipPercent)) / 100n;
}
