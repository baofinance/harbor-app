"use client";

import React from "react";
import InfoTooltip from "./InfoTooltip";

interface AnchorClaimMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBasicClaim: () => void;
  onCompound: () => void;
  onBuyTide: () => void;
  marketSymbol: string;
  isLoading?: boolean;
}

export const AnchorClaimMarketModal = ({
  isOpen,
  onClose,
  onBasicClaim,
  onCompound,
  onBuyTide,
  marketSymbol,
  isLoading = false,
}: AnchorClaimMarketModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-lg">
        <div className="flex items-center justify-between p-6 border-b border-[#1E4775]/20">
          <h2 className="text-2xl font-bold text-[#1E4775]">Claim {marketSymbol} Rewards</h2>
          <button
            onClick={onClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
            disabled={isLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[#1E4775]/80 leading-relaxed">
            Choose how you&apos;d like to handle your claimable rewards for {marketSymbol}.
          </p>

          <div className="space-y-3">
            {/* Basic Claim */}
            <div className="flex items-center justify-between p-3 bg-[#F0F4F8] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[#1E4775]">Basic Claim</span>
                <InfoTooltip
                  label="Claim rewards to your wallet."
                  side="top"
                  className="text-[#1E4775]/60"
                />
              </div>
              <button
                onClick={() => {
                  onBasicClaim();
                  onClose();
                }}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                  isLoading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#1E4775] hover:bg-[#17395F] text-white"
                }`}
              >
                {isLoading ? "Claiming..." : "Claim"}
              </button>
            </div>

            {/* Compound */}
            <div className="flex items-center justify-between p-3 bg-[#F0F4F8] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[#1E4775]">Compound</span>
                <InfoTooltip
                  label="Convert rewards to more pegged tokens and deposit into stability pools."
                  side="top"
                  className="text-[#1E4775]/60"
                />
              </div>
              <button
                onClick={() => {
                  onCompound();
                  onClose();
                }}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                  isLoading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#FF8A7A] hover:bg-[#E07A6A] text-white"
                }`}
              >
                {isLoading ? "Compounding..." : "Compound"}
              </button>
            </div>

            {/* Buy $TIDE */}
            <div className="flex items-center justify-between p-3 bg-[#F0F4F8] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[#1E4775]">Buy $TIDE</span>
                <InfoTooltip
                  label="Use your rewards to increase your ownership of Harbor's governance rights and revenue."
                  side="top"
                  className="text-[#1E4775]/60"
                />
              </div>
              <button
                onClick={() => {
                  onBuyTide();
                  onClose();
                }}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-full ${
                  isLoading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#B8EBD5] hover:bg-[#A0D0C0] text-[#1E4775]"
                }`}
              >
                {isLoading ? "Buying..." : "Buy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};






