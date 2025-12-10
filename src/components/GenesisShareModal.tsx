"use client";

import React from "react";

interface GenesisShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  depositAmount?: string;
  tokenSymbol?: string;
}

export const GenesisShareModal = ({
  isOpen,
  onClose,
  depositAmount,
  tokenSymbol,
}: GenesisShareModalProps) => {
  if (!isOpen) return null;

  const shareMessage = `Just secured my @0xharborfi airdrop with their maiden voyage. ⚓️

Predeposits are still open for a limited time - don't miss out!

https://www.harborfinance.io/`;

  const handleShareOnX = () => {
    const encodedMessage = encodeURIComponent(shareMessage);
    const xUrl = `https://x.com/intent/tweet?text=${encodedMessage}`;
    window.open(xUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200 overflow-hidden">
        {/* Decorative header wave */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[#1E4775] via-[#2A5A8C] to-[#17395F]">
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              className="w-full h-8"
            >
              <path
                d="M0,40 L0,20 Q50,0 100,20 T200,20 T300,20 T400,20 L400,40 Z"
                fill="white"
              />
            </svg>
          </div>
        </div>

        {/* Anchor Icon */}
        <div className="relative pt-8 pb-2 flex justify-center">
          <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-[#B8EBD5]">
            <span className="text-4xl">⚓️</span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4 text-center space-y-4">
          {/* Thank you message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#1E4775]">
              Welcome Aboard!
            </h2>
            <p className="text-[#1E4775]/80 text-lg">
              Thank you for joining the Maiden Voyage!
            </p>
          </div>

          {/* Deposit confirmation */}
          {depositAmount && tokenSymbol && (
            <div className="bg-[#B8EBD5]/20 border border-[#B8EBD5]/50 rounded-lg p-4">
              <p className="text-sm text-[#1E4775]/70">Your deposit</p>
              <p className="text-2xl font-bold text-[#1E4775] font-mono">
                {depositAmount} {tokenSymbol}
              </p>
            </div>
          )}

          {/* Share prompt */}
          <div className="pt-2">
            <p className="text-[#1E4775]/70 text-sm">
              Spread the word and let others know about Harbor!
            </p>
          </div>

          {/* Share on X button */}
          <button
            onClick={handleShareOnX}
            className="w-full py-3 px-6 bg-black hover:bg-gray-800 text-white font-medium rounded-full transition-all flex items-center justify-center gap-3 group"
          >
            {/* X (Twitter) Logo */}
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Share on X</span>
            <svg
              className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-2 text-[#1E4775]/60 hover:text-[#1E4775] transition-colors text-sm"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

