"use client";

import { useCallback, useState } from "react";
import type { TideTransactionStatus } from "@/components/tide/TideTransactionModal";

export type TideTransactionModalState = {
  isOpen: boolean;
  status: TideTransactionStatus;
  title: string;
  message: string;
  txHash?: string;
};

const CLOSED: TideTransactionModalState = {
  isOpen: false,
  status: "awaiting_wallet",
  title: "",
  message: "",
};

export function useTideTransactionModal() {
  const [modal, setModal] = useState<TideTransactionModalState>(CLOSED);

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
