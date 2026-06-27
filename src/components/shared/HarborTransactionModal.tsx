"use client";

import { Loader2, X } from "lucide-react";
import { getBlockExplorerConfig, getBlockExplorerTxUrl } from "@/config/blockExplorers";

export type HarborTransactionStatus =
  | "awaiting_wallet"
  | "confirming"
  | "success"
  | "error";

export type HarborTransactionModalProps = {
  isOpen: boolean;
  status: HarborTransactionStatus;
  title: string;
  message: string;
  txHash?: string;
  chainId: number;
  onClose: () => void;
};

export function HarborTransactionModal({
  isOpen,
  status,
  title,
  message,
  txHash,
  chainId,
  onClose,
}: HarborTransactionModalProps) {
  if (!isOpen) return null;

  const explorer = getBlockExplorerConfig(chainId);
  const canDismiss = status === "success" || status === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70"
        onClick={canDismiss ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="harbor-tx-modal-title"
        className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a1a] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        {canDismiss ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1 text-white/45 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="flex flex-col items-center text-center">
          {status === "awaiting_wallet" || status === "confirming" ? (
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#B8EBD5]" />
          ) : status === "success" ? (
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#B8EBD5]/15 text-xl text-[#B8EBD5]">
              ✓
            </div>
          ) : (
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8A7A]/15 text-xl text-[#FF8A7A]">
              !
            </div>
          )}

          <h3 id="harbor-tx-modal-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-snug text-white/55">{message}</p>

          {txHash ? (
            <a
              href={getBlockExplorerTxUrl(txHash, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-sm font-medium text-[#8CB8DC] hover:underline"
            >
              View on {explorer.name}
            </a>
          ) : null}

          {canDismiss ? (
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] hover:bg-white/90"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
