"use client";

import { useAccount } from "wagmi";
import { useImpersonation } from "@/contexts/ImpersonationContext";

/**
 * Effective wallet for read-only UI (balances, deposits, marks).
 * When impersonating, returns the target address and treats the session as connected.
 * Use wagmi `useAccount()` directly for signing / transactions.
 */
export function useHarborAccount() {
  const account = useAccount();
  const { impersonatedAddress, isImpersonating } = useImpersonation();

  const address = impersonatedAddress ?? account.address;
  const isConnected = isImpersonating || account.isConnected;

  return {
    ...account,
    address,
    isConnected,
    isImpersonating,
    walletAddress: account.address,
    walletConnected: account.isConnected,
  };
}
