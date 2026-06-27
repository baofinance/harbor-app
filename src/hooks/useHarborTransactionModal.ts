"use client";

import { useCallback, useState } from "react";
import type { HarborTransactionStatus } from "@/components/shared/HarborTransactionModal";

export type HarborTransactionModalState = {
  isOpen: boolean;
  status: HarborTransactionStatus;
  title: string;
  message: string;
  txHash?: string;
};

const CLOSED: HarborTransactionModalState = {
  isOpen: false,
  status: "awaiting_wallet",
  title: "",
  message: "",
};

export function useHarborTransactionModal() {
  const [modal, setModal] = useState<HarborTransactionModalState>(CLOSED);

  const close = useCallback(() => setModal(CLOSED), []);

  const openAwaitingWallet = useCallback((title: string, message: string) => {
    setModal({
      isOpen: true,
      status: "awaiting_wallet",
      title,
      message,
    });
  }, []);

  const openConfirming = useCallback(
    (title: string, message: string, txHash: string) => {
      setModal({
        isOpen: true,
        status: "confirming",
        title,
        message,
        txHash,
      });
    },
    []
  );

  const openSuccess = useCallback(
    (title: string, message: string, txHash: string) => {
      setModal({
        isOpen: true,
        status: "success",
        title,
        message,
        txHash,
      });
    },
    []
  );

  const openError = useCallback((title: string, message: string) => {
    setModal({
      isOpen: true,
      status: "error",
      title,
      message,
    });
  }, []);

  const updateMessage = useCallback((message: string) => {
    setModal((prev) => (prev.isOpen ? { ...prev, message } : prev));
  }, []);

  return {
    modal,
    close,
    openAwaitingWallet,
    openConfirming,
    openSuccess,
    openError,
    updateMessage,
  };
}

export type HarborTransactionModalControls = ReturnType<
  typeof useHarborTransactionModal
>;
