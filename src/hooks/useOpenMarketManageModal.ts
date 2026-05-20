import { useCallback } from "react";
import {
  ensureMarketWalletChain,
  type SwitchChainFn,
} from "@/utils/ensureMarketWalletChain";

export function useOpenMarketManageModal<TPayload extends { market?: unknown }>({
  isConnected,
  connectedChainId,
  switchChain,
  setManageModal,
  logLabel = "Market",
}: {
  isConnected: boolean;
  connectedChainId: number | undefined;
  switchChain: SwitchChainFn;
  setManageModal: (payload: TPayload | null) => void;
  logLabel?: string;
}) {
  return useCallback(
    async (payload: TPayload) => {
      const marketChainId =
        (payload.market as { chainId?: number } | undefined)?.chainId ?? 1;
      const isReady = await ensureMarketWalletChain({
        isConnected,
        connectedChainId,
        marketChainId,
        switchChain,
        onSwitchRejected: (err) => {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[${logLabel}] Network switch rejected before opening manage modal:`,
              err
            );
          }
        },
      });
      if (!isReady) return;
      setManageModal(payload);
    },
    [connectedChainId, isConnected, logLabel, setManageModal, switchChain]
  );
}
