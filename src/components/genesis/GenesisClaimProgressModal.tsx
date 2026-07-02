"use client";

import {
  HARBOR_BTN_GLASS_CTA_FULL_NAVY_CLASS,
} from "@/components/shared/harborButtonStyles";
import { HARBOR_FROSTED_MODAL_SHELL } from "@/components/shared/harborFrostedSurfaceStyles";

export type GenesisClaimProgressModalProps = {
  open: boolean;
  status: "pending" | "success" | "error";
  errorMessage?: string;
  onClose: () => void;
  onShare?: () => void;
  marketName?: string;
  peggedSymbolNoPrefix?: string;
};

export function GenesisClaimProgressModal({
  open,
  status,
  errorMessage,
  onClose,
  onShare,
  marketName,
  peggedSymbolNoPrefix,
}: GenesisClaimProgressModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={status === "pending" ? undefined : onClose}
      />
      <div className={`relative ${HARBOR_FROSTED_MODAL_SHELL} w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200  overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E4775]/10">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#1E4775]/60">
              Claim Progress
            </p>
            <h3 className="text-sm font-semibold text-[#1E4775]">
              {status === "pending"
                ? "Processing claim"
                : status === "success"
                  ? "Claim successful"
                  : "Claim failed"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#1E4775]/60 hover:text-[#1E4775]"
            disabled={status === "pending"}
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          {status === "pending" && (
            <div className="space-y-3">
              <p className="text-sm text-[#1E4775]/80">
                Waiting for transaction confirmation...
              </p>
              <div className="w-full bg-[#1E4775]/10 h-2 rounded-full overflow-hidden">
                <div className="h-2 bg-[#1E4775] animate-pulse w-1/2 rounded-full" />
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="p-4 bg-[rgb(var(--surface-selected-rgb))]/20 border border-[rgb(var(--surface-selected-border-rgb))]  text-center">
                <p className="text-sm text-[#1E4775]/80">
                  Tokens claimed{marketName ? ` for ${marketName}` : ""}.
                </p>
              </div>

              <div className="space-y-2 bg-[#17395F]/5 border border-[#1E4775]/15  p-4">
                <div className="text-base font-semibold text-[#1E4775]">
                  Boost your airdrop
                </div>
                <p className="text-sm text-[#1E4775]/80">
                  Share that {marketName || "this market"} is live and invite
                  others to earn unbeatable yields on {peggedSymbolNoPrefix}{" "}
                  or get liquidation-protected, funding-free leverage.
                </p>
                {onShare && (
                  <button
                    type="button"
                    onClick={onShare}
                    className={`${HARBOR_BTN_GLASS_CTA_FULL_NAVY_CLASS} flex items-center justify-center gap-2`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 fill-current"
                      aria-hidden="true"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>Share on X</span>
                  </button>
                )}
                <p className="text-xs text-[#1E4775]/60 mt-2">
                  Share your post in the{" "}
                  <span className="font-semibold">#boosters</span> channel on
                  Discord to be included in the community marketing airdrop.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-100 ">
                <p className="text-sm text-red-700 font-semibold">Claim failed</p>
                <p className="text-xs text-[#1E4775]/80 break-words mt-1">
                  {errorMessage || "Something went wrong. Please try again."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
