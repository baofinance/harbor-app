"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useImpersonation } from "@/contexts/ImpersonationContext";

type ImpersonateDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ImpersonateDialog({ isOpen, onClose }: ImpersonateDialogProps) {
  const {
    impersonatedAddress,
    isImpersonating,
    setImpersonatedAddress,
    clearImpersonation,
    recentAddresses,
  } = useImpersonation();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(impersonatedAddress ?? "");
    setError(null);
  }, [isOpen, impersonatedAddress]);

  if (!isOpen) return null;

  const applyAddress = (raw: string) => {
    const trimmed = raw.trim();
    if (!isAddress(trimmed)) {
      setError("Enter a valid Ethereum address (0x…).");
      return;
    }
    setImpersonatedAddress(trimmed as `0x${string}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close impersonate dialog"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-xl border border-[#1E4775]/20 bg-white/88 backdrop-blur-lg backdrop-saturate-150 p-5 shadow-2xl"
        role="dialog"
        aria-labelledby="impersonate-title"
      >
        <h2
          id="impersonate-title"
          className="text-lg font-semibold text-[#1E4775]"
        >
          Impersonate wallet
        </h2>
        <p className="mt-1 text-sm text-[#1E4775]/70">
          Preview Earn, Leverage, and balances as another address. Signing still
          uses your connected wallet.
        </p>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[#1E4775]/70">
          Wallet address
        </label>
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          placeholder="0x…"
          className="mt-1 w-full rounded-lg border border-[#1E4775]/25 px-3 py-2 font-mono text-sm text-[#1E4775] focus:border-[#1E4775] focus:outline-none focus:ring-2 focus:ring-[#1E4775]/15"
          autoComplete="off"
          spellCheck={false}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : null}

        {recentAddresses.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1E4775]/60">
              Recent
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recentAddresses.map((addr) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => applyAddress(addr)}
                  className="rounded-full bg-[#f1f5f9] px-2.5 py-1 font-mono text-xs text-[#1E4775] ring-1 ring-[#1E4775]/10 hover:bg-[#e2e8f0]"
                >
                  {shortenAddress(addr)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyAddress(draft)}
            className="rounded-lg bg-[#1E4775] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E4775]/90"
          >
            Apply
          </button>
          {isImpersonating && (
            <button
              type="button"
              onClick={() => {
                clearImpersonation();
                onClose();
              }}
              className="rounded-lg border border-[#1E4775]/25 px-4 py-2 text-sm font-semibold text-[#1E4775] hover:bg-[#1E4775]/5"
            >
              Stop impersonating
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748b] hover:text-[#1E4775]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
