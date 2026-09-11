import type { PublicClient } from "viem";
import { GENESIS_ETH_ZAP_V1_ABI } from "@/abis/genesisEthZapV1Abi";

/** Default wrap-leg slippage for genesis v1 zaps (matches harbor-zap-contracts fork tests). */
export const GENESIS_ZAP_V1_DEFAULT_SLIPPAGE_BPS = 200n;

export function applyZapSlippageBps(
  amount: bigint,
  slipBps: bigint = GENESIS_ZAP_V1_DEFAULT_SLIPPAGE_BPS
): bigint {
  if (amount <= 0n) return 0n;
  if (slipBps >= 10000n) return 0n;
  return amount - (amount * slipBps) / 10000n;
}

async function readGenesisV1Preview(
  publicClient: Pick<PublicClient, "readContract"> | undefined,
  zapAddress: `0x${string}` | undefined,
  functionName: "previewWrappedCollateralFromBase" | "previewWrappedCollateralFromCollateral",
  amount: bigint
): Promise<bigint | undefined> {
  if (!publicClient || !zapAddress || amount <= 0n) return undefined;
  try {
    const preview = (await publicClient.readContract({
      address: zapAddress,
      abi: GENESIS_ETH_ZAP_V1_ABI,
      functionName,
      args: [amount],
    })) as bigint;
    return preview > 0n ? preview : undefined;
  } catch {
    return undefined;
  }
}

export async function genesisV1MinWrappedFromEth(
  publicClient: Pick<PublicClient, "readContract"> | undefined,
  zapAddress: `0x${string}` | undefined,
  ethAmountWei: bigint,
  slipBps: bigint = GENESIS_ZAP_V1_DEFAULT_SLIPPAGE_BPS
): Promise<bigint> {
  const preview = await readGenesisV1Preview(
    publicClient,
    zapAddress,
    "previewWrappedCollateralFromBase",
    ethAmountWei
  );
  if (preview != null) {
    return applyZapSlippageBps(preview, slipBps);
  }
  return 0n;
}

export async function genesisV1MinWrappedFromStEth(
  publicClient: Pick<PublicClient, "readContract"> | undefined,
  zapAddress: `0x${string}` | undefined,
  stEthAmountWei: bigint,
  slipBps: bigint = GENESIS_ZAP_V1_DEFAULT_SLIPPAGE_BPS
): Promise<bigint> {
  const preview = await readGenesisV1Preview(
    publicClient,
    zapAddress,
    "previewWrappedCollateralFromCollateral",
    stEthAmountWei
  );
  if (preview != null) {
    return applyZapSlippageBps(preview, slipBps);
  }
  return 0n;
}
