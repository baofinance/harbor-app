"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { mainnet } from "wagmi/chains";

export interface UseNetworkSwitchOptions {
  /** Target chain ID. Defaults to mainnet. */
  targetChainId?: number;
}

/**
 * Shared network guard and switch logic for mainnet-only flows (e.g. Anchor modal).
 * Prefers connector.getChainId() over useChainId() when the wallet is on an unsupported chain.
 */
export function useNetworkSwitch(options: UseNetworkSwitchOptions = {}) {
  const { targetChainId = mainnet.id } = options;
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [walletChainId, setWalletChainId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      if (!connector?.getChainId) {
        if (!cancelled) setWalletChainId(null);
        return;
      }
      try {
        const id = await connector.getChainId();
        if (!cancelled) setWalletChainId(id);
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useNetworkSwitch] Failed to read connector chainId:", e);
        }
        if (!cancelled) setWalletChainId(null);
      }
    };
    read();
    return () => {
      cancelled = true;
    };
  }, [connector]);

  const effectiveChainId = walletChainId ?? chainId;
  const isCorrectNetwork = effectiveChainId === targetChainId;
  const shouldShowNetworkSwitch = !isCorrectNetwork && isConnected;

  const refreshWalletChainId = async () => {
    if (!connector?.getChainId) return;
    try {
      const id = await connector.getChainId();
      setWalletChainId(id);
    } catch {
      setWalletChainId(null);
    }
  };

  /** Switch to target chain. Throws on error. */
  const switchToTarget = async (): Promise<void> => {
    await switchChain({ chainId: targetChainId });
    await refreshWalletChainId();
  };

  /**
   * Ensure we're on the target chain. If not, attempts to switch.
   * @returns true if on target (or switch succeeded), false if switch failed/rejected.
   */
  const ensureCorrectNetwork = async (): Promise<boolean> => {
    if (!isConnected) return true;

    let current: number | null = null;
    try {
      current = connector?.getChainId ? await connector.getChainId() : null;
    } catch {
      current = null;
    }
    const toCheck = current ?? effectiveChainId;
    if (toCheck === targetChainId) return true;

    try {
      await switchChain({ chainId: targetChainId });
      await refreshWalletChainId();
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[useNetworkSwitch] Auto switch rejected/failed:", err);
      }
      return false;
    }
  };

  /** Manual switch handler for UI (e.g. "Switch Network" button). Throws on error. */
  const handleSwitchNetwork = switchToTarget;

  return {
    effectiveChainId,
    isCorrectNetwork,
    shouldShowNetworkSwitch,
    isSwitching,
    handleSwitchNetwork,
    ensureCorrectNetwork,
  };
}
