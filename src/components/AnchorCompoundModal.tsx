"use client";

import React from "react";
import { formatEther } from "viem";

interface AnchorCompoundModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
 poolType:"collateral" |"sail";
 rewardAmount: bigint;
 rewardTokenSymbol: string;
 expectedPeggedOutput: bigint;
 peggedTokenSymbol: string;
 fees?: {
 label: string;
 amount: bigint;
 tokenSymbol: string;
 }[];
 isLoading?: boolean;
}

export const AnchorCompoundModal = ({
 isOpen,
 onClose,
 onConfirm,
 poolType,
 rewardAmount,
 rewardTokenSymbol,
 expectedPeggedOutput,
 peggedTokenSymbol,
 fees = [],
 isLoading = false,
}: AnchorCompoundModalProps) => {
 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={onClose}
 />

        <div className="relative bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-none max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-[#1E4775]/20">
 <h2 className="text-2xl font-bold text-[#1E4775]">Compound Rewards</h2>
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

          <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
 <div className="text-sm text-[#1E4775]/70">
 {poolType ==="collateral" ? (
 <p>
 Claim {rewardTokenSymbol} rewards, mint {peggedTokenSymbol} tokens, and deposit into stability pool.
 </p>
 ) : (
 <p>
 Claim {rewardTokenSymbol} rewards, redeem for collateral, mint {peggedTokenSymbol} tokens, and deposit into stability pool.
 </p>
 )}
 </div>

 {/* Input */}
 <div className="space-y-2">
 <div className="text-xs text-[#1E4775]/70 uppercase tracking-wider">Input</div>
 <div className="p-4 bg-[#17395F]/10 border border-[#17395F]/20">
 <div className="flex justify-between items-center">
 <span className="text-sm text-[#1E4775]/70">Rewards to claim:</span>
 <span className="text-lg font-bold text-[#1E4775] font-mono">
 {formatEther(rewardAmount)} {rewardTokenSymbol}
 </span>
 </div>
 </div>
 </div>

 {/* Expected Output */}
 <div className="space-y-2">
 <div className="text-xs text-[#1E4775]/70 uppercase tracking-wider">Expected Output</div>
 <div className="p-4 bg-[rgb(var(--surface-selected-rgb))]/30 border border-[rgb(var(--surface-selected-border-rgb))]/50">
 <div className="flex justify-between items-center">
 <span className="text-sm text-[#1E4775]/70">Pegged tokens to receive:</span>
 <span className="text-lg font-bold text-[#1E4775] font-mono">
 {formatEther(expectedPeggedOutput)} {peggedTokenSymbol}
 </span>
 </div>
 </div>
 </div>

 {/* Fees */}
 {fees.length > 0 && (
 <div className="space-y-2">
 <div className="text-xs text-[#1E4775]/70 uppercase tracking-wider">Fees</div>
 <div className="space-y-2">
 {fees.map((fee, index) => (
 <div
 key={index}
 className="p-3 bg-[#FF8A7A]/10 border border-[#FF8A7A]/20"
 >
 <div className="flex justify-between items-center">
 <span className="text-sm text-[#1E4775]/70">{fee.label}:</span>
 <span className="text-sm font-semibold text-[#1E4775] font-mono">
 {formatEther(fee.amount)} {fee.tokenSymbol}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Transaction Steps */}
 <div className="space-y-2">
 <div className="text-xs text-[#1E4775]/70 uppercase tracking-wider">Transaction Steps</div>
 <div className="space-y-2 text-sm text-[#1E4775]/80">
 {poolType ==="collateral" ? (
 <>
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-[#1E4775] text-white flex items-center justify-center text-xs font-bold">1</span>
 <span>Claim {rewardTokenSymbol} rewards</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-[#1E4775] text-white flex items-center justify-center text-xs font-bold">2</span>
 <span>Mint {peggedTokenSymbol} tokens</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-[#1E4775] text-white flex items-center justify-center text-xs font-bold">3</span>
 <span>Deposit into stability pool</span>
 </div>
 </>
 ) : (
 <>
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-[#1E4775] text-white flex items-center justify-center text-xs font-bold">1</span>
 <span>Claim {rewardTokenSymbol} rewards</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-[#1E4775] text-white flex items-center justify-center text-xs font-bold">2</span>
 <span>Redeem {rewardTokenSymbol} for collateral</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-[#1E4775] text-white flex items-center justify-center text-xs font-bold">3</span>
 <span>Mint {peggedTokenSymbol} tokens</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-[#1E4775] text-white flex items-center justify-center text-xs font-bold">4</span>
 <span>Deposit into stability pool</span>
 </div>
 </>
 )}
 </div>
 </div>
 </div>

          <div className="flex gap-2 sm:gap-4 p-3 sm:p-4 lg:p-6 border-t border-[#1E4775]/20">
 <button
 onClick={onClose}
 className="flex-1 py-2 px-4 text-[#1E4775]/70 hover:text-[#1E4775] transition-colors rounded-full"
 disabled={isLoading}
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 disabled={isLoading}
 className={`flex-1 py-2 px-4 font-medium transition-colors rounded-full ${
 isLoading
 ?"bg-gray-300 text-gray-500 cursor-not-allowed"
 :"bg-[#1E4775] hover:bg-[#17395F] text-white"
 }`}
 >
 {isLoading ?"Processing..." :"Confirm Compound"}
 </button>
 </div>
 </div>
 </div>
 );
};


















