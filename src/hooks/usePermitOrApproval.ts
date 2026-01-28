/**
 * usePermitOrApproval Hook
 * 
 * Provides a reusable hook for handling permit or approval flows for ERC20 tokens.
 * Automatically checks permit support and falls back to approval if needed.
 */

import { useCallback } from "react";
import { type Address, type PublicClient, type WalletClient } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { useAccount } from "wagmi";
import { ERC20_ABI } from "@/abis/shared";
import {
  checkPermitSupport,
  getPermitNonce,
  buildPermitDomain,
  signPermit,
  calculateDeadline,
  type PermitData,
} from "@/utils/permit";

export interface PermitOrApprovalResult {
  usePermit: boolean;
  permitSig?: {
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
  };
  deadline?: bigint;
}

/**
 * Hook to handle permit or approval for a token
 * Returns a function that can be called to get permit signature or determine if approval is needed
 */
export function usePermitOrApproval() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const handlePermitOrApproval = useCallback(
    async (
      tokenAddress: `0x${string}`,
      spenderAddress: `0x${string}`,
      amount: bigint
    ): Promise<PermitOrApprovalResult | null> => {
      if (!publicClient || !walletClient || !address) {
        return { usePermit: false };
      }

      try {
        // Check if token supports permit
        const supportsPermit = await checkPermitSupport(
          publicClient,
          tokenAddress,
          address as `0x${string}`
        );

        if (!supportsPermit) {
          // Token doesn't support permit, use approval
          return { usePermit: false };
        }

        // Check current allowance first - if sufficient, no permit needed
        const currentAllowance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, spenderAddress],
        });

        const allowanceBigInt = (currentAllowance as bigint) || 0n;
        if (allowanceBigInt >= amount) {
          // Already has sufficient allowance, no permit needed
          return { usePermit: false };
        }

        // Get current nonce from the token contract (0 for first permit, 1 for second, etc.)
        const nonce = await getPermitNonce(publicClient, tokenAddress, address as `0x${string}`);

        // Build permit domain
        const domain = await buildPermitDomain(publicClient, tokenAddress);
        if (!domain) {
          console.warn("Failed to build permit domain, falling back to approval");
          return { usePermit: false };
        }

        // Calculate deadline (1 hour from now)
        const deadline = calculateDeadline(3600);

        // Build permit data
        const permitData: PermitData = {
          owner: address as `0x${string}`,
          spender: spenderAddress,
          value: amount,
          nonce,
          deadline,
        };

        // Sign permit
        const permitSig = await signPermit(walletClient, tokenAddress, permitData, domain);

        if (!permitSig) {
          console.warn("Failed to sign permit, falling back to approval");
          return { usePermit: false };
        }

        // Return permit signature
        return {
          usePermit: true,
          permitSig,
          deadline,
        };
      } catch (error: any) {
        const errorMessage = error?.message?.toLowerCase?.() || "";
        const errorName = error?.name || "";
        const isUserRejected =
          errorName === "UserRejectedRequestError" ||
          errorMessage.includes("user rejected") ||
          errorMessage.includes("user denied") ||
          errorMessage.includes("rejected the request") ||
          errorMessage.includes("denied request");

        // User cancelled signature - silently fall back to approval
        if (isUserRejected) {
          return { usePermit: false };
        }

        // Check for EIP-7702 related errors or other permit failures
        const isEIP7702Error =
          errorMessage.includes("7702") ||
          errorMessage.includes("delegation") ||
          errorMessage.includes("eip-7702") ||
          error?.code === -32603; // RPC errors

        if (isEIP7702Error) {
          console.warn(
            "Permit failed due to EIP-7702 delegation or similar issue, falling back to approval:",
            error
          );
        } else {
          console.error("Error in permit flow, falling back to approval:", error);
        }
        return { usePermit: false };
      }
    },
    [publicClient, walletClient, address]
  );

  return { handlePermitOrApproval };
}
