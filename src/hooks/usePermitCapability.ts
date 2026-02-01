/**
 * usePermitCapability Hook
 *
 * Detects whether the connected wallet supports EIP-2612 permit (signTypedData).
 * Smart contract wallets and MetaMask delegated wallets typically do not support
 * permit for stETH/wstETH - we auto-disable permit for those tokens.
 * USDC, FXUSD, FXSAVE work with permit even on smart/delegated wallets (see config/permit).
 */

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { tokenPermitOnSmartWallet } from "@/config/permit";

export interface UsePermitCapabilityOptions {
  enabled?: boolean;
  /** Selected deposit asset symbol (e.g. "stETH", "USDC") - used when smart wallet to check allowlist */
  depositAssetSymbol?: string | null;
}

export interface UsePermitCapabilityResult {
  /** Whether permit is expected to work */
  isPermitCapable: boolean;
  /** True if the connected address is a smart contract (has bytecode) */
  isSmartContractWallet: boolean;
  /** Loading state while checking */
  isLoading: boolean;
  /** Human-readable reason when permit is disabled (for tooltip) */
  disableReason: string | null;
}

/**
 * Check if an address is a smart contract (has deployed bytecode).
 * EOAs return "0x" or "0x0"; smart contract wallets have bytecode.
 */
async function isSmartContract(
  publicClient: { getCode: (args: { address: `0x${string}` }) => Promise<unknown> },
  address: `0x${string}`
): Promise<boolean> {
  try {
    const code = await publicClient.getCode({ address });
    if (!code || typeof code !== "string") return false;
    // EOAs return "0x"; smart contracts have bytecode
    const hex = code.toLowerCase().replace(/^0x/, "");
    return hex.length > 0 && !/^0+$/.test(hex);
  } catch {
    return false; // Assume EOA on error to avoid blocking
  }
}

/**
 * Detect if the connected wallet supports permit for the given deposit asset.
 * - EOA: permit works for all tokens that support it.
 * - Smart/delegated wallet: only tokens in config (USDC, FXUSD, FXSAVE) work;
 *   stETH, wstETH and others do not.
 */
export function usePermitCapability(
  enabledOrOptions: boolean | UsePermitCapabilityOptions = true
): UsePermitCapabilityResult {
  const opts = typeof enabledOrOptions === "boolean"
    ? { enabled: enabledOrOptions }
    : enabledOrOptions;
  const { enabled = true, depositAssetSymbol } = opts;

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const {
    data: isSmartContractWallet = false,
    isLoading,
  } = useQuery({
    queryKey: ["permitCapability", address, publicClient?.uid],
    queryFn: async () => {
      if (!publicClient || !address) return false;
      return isSmartContract(publicClient, address as `0x${string}`);
    },
    enabled: enabled && !!publicClient && !!address && isConnected,
    staleTime: 60_000, // 1 min - wallet type doesn't change often
    retry: 1,
  });

  // EOA: permit capable. Smart wallet: only if token is in allowlist (USDC, FXUSD, FXSAVE)
  const tokenAllowsPermitOnSmartWallet = depositAssetSymbol
    ? tokenPermitOnSmartWallet(depositAssetSymbol)
    : false;
  const isPermitCapable = !isSmartContractWallet || tokenAllowsPermitOnSmartWallet;
  const disableReason = isSmartContractWallet && !tokenAllowsPermitOnSmartWallet
    ? "Permit is not supported with smart contract or delegated wallets for this token. Use approval instead."
    : null;

  return {
    isPermitCapable,
    isSmartContractWallet,
    isLoading,
    disableReason,
  };
}
