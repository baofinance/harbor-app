"use client";

import { createContext, useContext, type ReactNode } from "react";
import { HarborTransactionModal } from "@/components/shared/HarborTransactionModal";
import { TIDE_CONFIG } from "@/config/tide";
import {
  useHarborTransactionModal,
  type HarborTransactionModalControls,
} from "@/hooks/useHarborTransactionModal";

const TideTransactionContext =
  createContext<HarborTransactionModalControls | null>(null);

export function TideTransactionProvider({ children }: { children: ReactNode }) {
  const txModal = useHarborTransactionModal();

  return (
    <TideTransactionContext.Provider value={txModal}>
      {children}
      <HarborTransactionModal
        {...txModal.modal}
        chainId={TIDE_CONFIG.chainId}
        onClose={txModal.close}
      />
    </TideTransactionContext.Provider>
  );
}

export function useTideTransaction(): HarborTransactionModalControls {
  const ctx = useContext(TideTransactionContext);
  if (!ctx) {
    throw new Error(
      "useTideTransaction must be used within TideTransactionProvider"
    );
  }
  return ctx;
}
