"use client";

import React, { useState } from "react";
import { TransactionStep } from "./TransactionProgressModal";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export interface FeeInfo {
 feeAmount: bigint;
 feeFormatted: string;
 feeUSD?: number;
 feePercentage?: number;
 tokenSymbol: string;
 label: string;
}

interface CompoundConfirmationModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
 steps: TransactionStep[];
 fees: FeeInfo[];
 feeErrors?: string[];
}

// Helper to format token amounts with smart rounding
const formatTokenAmount = (amount: string | number): string => {
 const num = typeof amount ==="string" ? parseFloat(amount) : amount;
 if (isNaN(num) || num === 0) return"0";
 if (num >= 1) return num.toFixed(4);
 if (num >= 0.0001) return num.toFixed(6);
 // For very small numbers, show up to 8 significant digits
 return num.toPrecision(4);
};

// Helper to format USD with smart rounding
const formatUSD = (amount: number): string => {
 if (amount >= 1) return amount.toFixed(2);
 if (amount >= 0.01) return amount.toFixed(2);
 if (amount >= 0.0001) return amount.toFixed(4);
 return"<$0.01";
};

// Compact fee badge component
const FeeBadge = ({ fee }: { fee: FeeInfo }) => (
 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 border border-amber-300 text-[10px] text-amber-800 font-medium whitespace-nowrap">
 <span className="text-amber-600">Fee:</span>
 <span className="font-semibold">
 {formatTokenAmount(fee.feeFormatted)} {fee.tokenSymbol}
 </span>
 {fee.feeUSD !== undefined && fee.feeUSD > 0 && (
 <span className="text-amber-600">
 (${formatUSD(fee.feeUSD)})
 </span>
 )}
 </div>
);

export const CompoundConfirmationModal = ({
 isOpen,
 onClose,
 onConfirm,
 steps,
 fees,
 feeErrors = [],
}: CompoundConfirmationModalProps) => {
 const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

 if (!isOpen) return null;

 const totalFeeUSD = fees.reduce((sum, fee) => sum + (fee.feeUSD || 0), 0);

 const toggleStep = (stepId: string) => {
 setExpandedSteps((prev) => {
 const next = new Set(prev);
 if (next.has(stepId)) {
 next.delete(stepId);
 } else {
 next.add(stepId);
 }
 return next;
 });
 };

 // Helper to get fee for a step
 const getStepFee = (step: TransactionStep): FeeInfo | undefined => {
 if (step.fee) {
 return {
 feeAmount: step.fee.amount,
 feeFormatted: step.fee.formatted,
 feeUSD: step.fee.usd,
 feePercentage: step.fee.percentage,
 tokenSymbol: step.fee.tokenSymbol,
 label: step.id ==="redeem" ?"Redeem Leveraged Tokens" : step.id ==="mint" ?"Mint Pegged Tokens" :"",
 };
 }
 return fees.find((f) => {
 if (step.id ==="redeem") return f.label ==="Redeem Leveraged Tokens";
 if (step.id ==="mint") return f.label ==="Mint Pegged Tokens";
 return false;
 });
 };

 return (
 <div className="fixed inset-0 z-[60] flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={onClose}
 />
        <div className="relative bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-none">
 <div className="flex items-center justify-between p-3 border-b border-[#1E4775]/20">
 <h2 className="text-base font-bold text-[#1E4775]">Compound Rewards</h2>
 <button
 onClick={onClose}
 className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors p-1"
 >
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 <div className="p-3 space-y-3">
 {/* Compact Transaction Steps */}
 <div className="space-y-1">
 {steps.map((step, index) => {
 const stepFee = getStepFee(step);
 const isExpanded = expandedSteps.has(step.id);
 const hasDetails = step.details || stepFee;

 return (
 <div
 key={step.id}
 className={`border border-[#1E4775]/15 overflow-hidden transition-all ${
 hasDetails ?"cursor-pointer hover:border-[#1E4775]/30" :""
 }`}
 onClick={() => hasDetails && toggleStep(step.id)}
 >
 {/* Step Header - Always Visible */}
 <div className="flex items-center gap-2 p-2 bg-white">
 {/* Expand/Collapse Icon */}
 {hasDetails ? (
 <div className="w-4 h-4 flex items-center justify-center text-[#1E4775]/50">
 {isExpanded ? (
 <ChevronDownIcon className="w-3 h-3" />
 ) : (
 <ChevronRightIcon className="w-3 h-3" />
 )}
 </div>
 ) : (
 <div className="w-4" />
 )}
 
 {/* Step Number */}
 <div className="w-5 h-5 rounded-full bg-[#1E4775] flex items-center justify-center text-[10px] text-white font-semibold flex-shrink-0">
 {index + 1}
 </div>
 
 {/* Step Label */}
 <span className="text-xs font-medium text-[#1E4775] flex-1 truncate">
 {step.label}
 </span>
 
 {/* Fee Badge (if applicable) */}
 {stepFee && <FeeBadge fee={stepFee} />}
 </div>

 {/* Expanded Details */}
 {isExpanded && hasDetails && (
 <div className="px-3 pb-2 pt-0 border-t border-[#1E4775]/10 bg-[#1E4775]/[0.02]">
 {step.details && (
 <p className="text-[11px] text-[#1E4775]/70 mt-2 ml-9">
 {step.details}
 </p>
 )}
 {stepFee && (
 <div className="mt-2 ml-9 p-2 bg-amber-50 border border-amber-200 text-[11px]">
 <div className="flex items-center justify-between gap-2">
 <span className="text-amber-700">Fee:</span>
 <span className="text-amber-800 font-medium">
 {stepFee.feePercentage !== undefined && (
 <span className="text-amber-600 mr-1">
 ({stepFee.feePercentage.toFixed(2)}%)
 </span>
 )}
 {formatTokenAmount(stepFee.feeFormatted)} {stepFee.tokenSymbol}
 {stepFee.feeUSD !== undefined && stepFee.feeUSD > 0 && (
 <span className="text-amber-600 ml-1">
 ≈ ${formatUSD(stepFee.feeUSD)}
 </span>
 )}
 </span>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Total Fees Summary - Compact */}
 {fees.length > 0 && (
 <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-200">
 <span className="text-xs font-medium text-amber-800">Total Fees:</span>
 <span className="text-xs font-bold text-amber-900">
 {fees.map((f, i) => (
 <span key={i}>
 {i > 0 &&" +"}
 {formatTokenAmount(f.feeFormatted)} {f.tokenSymbol}
 </span>
 ))}
 {totalFeeUSD > 0 && (
 <span className="text-amber-700 font-medium ml-1">
 (${formatUSD(totalFeeUSD)})
 </span>
 )}
 </span>
 </div>
 )}

 {/* Fee Errors */}
 {fees.length === 0 && feeErrors.length > 0 && (
 <div className="px-3 py-2 bg-orange-50 border border-orange-200">
 <p className="text-[11px] text-orange-700">
 ⚠️ Fee estimation unavailable. Fees will be shown during transaction.
 </p>
 </div>
 )}

 {/* No Fees Message */}
 {fees.length === 0 && feeErrors.length === 0 && (
 <div className="px-3 py-2 bg-green-50 border border-green-200">
 <p className="text-[11px] text-green-700">
 ✓ No protocol fees for this operation.
 </p>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex gap-2 pt-1">
 <button
 onClick={onClose}
 className="flex-1 px-3 py-2 text-xs font-medium bg-white text-[#1E4775] border border-[#1E4775]/30 hover:bg-[#1E4775]/5 transition-colors rounded-full"
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 className="flex-1 px-3 py-2 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full"
 >
 Continue
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};

