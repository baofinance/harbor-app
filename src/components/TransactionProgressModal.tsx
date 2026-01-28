"use client";

import React from "react";
import { AlertOctagon } from "lucide-react";
import { GenesisTransactionProgressSteps } from "./GenesisTransactionProgressSteps";
import { formatEther } from "viem";

export type TransactionStepStatus ="pending" |"in_progress" |"completed" |"error";

export interface TransactionStep {
 id: string;
 label: string;
 status: TransactionStepStatus;
 txHash?: string;
 error?: string;
 details?: string;
 fee?: {
 amount: bigint;
 formatted: string;
 usd?: number;
 percentage?: number;
 tokenSymbol: string;
 };
}

export interface FeeInfo {
 feeAmount: bigint;
 feeFormatted: string;
 feeUSD?: number;
 feePercentage?: number;
 tokenSymbol: string;
 label: string; // e.g.,"Redeem Sail Tokens","Mint Pegged Tokens"
}

interface TransactionProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: TransactionStep[];
  currentStepIndex: number;
  progressVariant?: "vertical" | "horizontal";
  showFeeInfo?: FeeInfo | FeeInfo[]; // Support single fee or array of fees
  onConfirmFee?: () => void;
  onCancel?: () => void;
  canCancel?: boolean; // Whether to show cancel button
  onRetry?: () => void; // Callback for"Try Again" button on error
  retryButtonLabel?: string; // Custom label for retry button (default: "Try Again")
  errorMessage?: string; // Optional error message to display
  renderSuccessContent?: () => React.ReactNode; // Optional extra content when all steps completed
}

export const TransactionProgressModal = ({
 isOpen,
 onClose,
 title,
 steps,
 currentStepIndex,
 progressVariant = "vertical",
 showFeeInfo,
 onConfirmFee,
 onCancel,
  canCancel = false,
  onRetry,
  retryButtonLabel = "Try Again",
  errorMessage,
  renderSuccessContent,
}: TransactionProgressModalProps) => {
 if (!isOpen) return null;
 const allCompleted = steps.every((s) => s.status ==="completed");

 // If we're showing fee info, show confirmation screen
 if (showFeeInfo && onConfirmFee) {
 const fees = Array.isArray(showFeeInfo) ? showFeeInfo : [showFeeInfo];
 const totalFeeUSD = fees.reduce((sum, fee) => sum + (fee.feeUSD || 0), 0);

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={onCancel || onClose}
 />
 <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200 max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-[#1E4775]/20">
 <h2 className="text-2xl font-bold text-[#1E4775]">{title}</h2>
 <button
 onClick={onCancel || onClose}
 className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
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
 {/* All Steps Preview with Fees */}
 <div>
 <h3 className="text-sm font-semibold text-[#1E4775] mb-3">
 Transaction Steps & Fees
 </h3>
 <div className="space-y-3">
 {steps.map((step, index) => {
 // Find fee for this step
 const stepFee = fees.find((f) => {
 if (step.id ==="redeem") {
 return f.label ==="Redeem Leveraged Tokens";
 } else if (step.id ==="mint") {
 return f.label ==="Mint Pegged Tokens";
 }
 return false;
 });

 return (
 <div key={step.id} className="border border-[#1E4775]/20 p-3">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
 {index + 1}
 </div>
 <span className="text-sm font-medium text-[#1E4775]">{step.label}</span>
 </div>
 {step.details && (
 <div className="text-xs text-[#1E4775]/70 ml-7 mb-2">
 {step.details}
 </div>
 )}
 {stepFee && (
 <div className="ml-7 mt-2 p-2 bg-yellow-50 border border-yellow-200 text-xs">
 <div className="font-semibold text-yellow-800 mb-1">Fee:</div>
 <div className="space-y-1 text-yellow-700">
 <div className="flex justify-between">
 <span>Amount:</span>
 <span className="font-mono font-semibold">
 {stepFee.feeFormatted} {stepFee.tokenSymbol}
 </span>
 </div>
 {stepFee.feePercentage !== undefined && (
 <div className="flex justify-between">
 <span>Percentage:</span>
 <span className="font-semibold">
 {stepFee.feePercentage.toFixed(2)}%
 </span>
 </div>
 )}
 {stepFee.feeUSD !== undefined && (
 <div className="flex justify-between">
 <span>Value:</span>
 <span className="font-semibold">
 ${stepFee.feeUSD.toFixed(2)}
 </span>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Total Fees Summary */}
 {fees.length > 0 && (
 <div className="bg-yellow-50 border border-yellow-200 p-4">
 <h3 className="text-sm font-semibold text-yellow-800 mb-2">
 Total Fees
 </h3>
 <div className="space-y-1 text-sm text-yellow-700">
 {fees.length > 1 && totalFeeUSD > 0 && (
 <div className="flex justify-between font-semibold">
 <span>Total Fee Value:</span>
 <span>${totalFeeUSD.toFixed(2)}</span>
 </div>
 )}
 {fees.length === 1 && fees[0].feeUSD !== undefined && (
 <div className="flex justify-between font-semibold">
 <span>Fee Value:</span>
 <span>${fees[0].feeUSD.toFixed(2)}</span>
 </div>
 )}
 </div>
 </div>
 )}

 <p className="text-sm text-[#1E4775]/80">
 These fees will be deducted during the transaction process. Do you want to
 continue?
 </p>

 <div className="flex gap-3">
 <button
 onClick={onCancel || onClose}
 className="flex-1 px-4 py-2 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 transition-colors rounded-full"
 >
 Cancel
 </button>
 <button
 onClick={onConfirmFee}
 className="flex-1 px-4 py-2 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full"
 >
 Continue
 </button>
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={onClose}
 />
 <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200 max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-[#1E4775]/20">
 <h2 className="text-2xl font-bold text-[#1E4775]">{title}</h2>
 <button
 onClick={onClose}
 className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
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

 <div className="p-6">
 {progressVariant === "horizontal" ? (
   <GenesisTransactionProgressSteps
     steps={steps}
     currentStepIndex={currentStepIndex}
   />
 ) : (
 <div className="space-y-2">
 {steps.map((step, index) => {
 const isActive = index === currentStepIndex;
 const isCompleted = step.status ==="completed";
 const isError = step.status ==="error";
 const isPending = step.status ==="pending";

 return (
 <div key={step.id} className="flex items-start gap-2">
 {/* Status Icon */}
 <div className="flex-shrink-0 mt-0.5">
 {isCompleted ? (
 <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
 <svg
 className="w-4 h-4 text-white"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M5 13l4 4L19 7"
 />
 </svg>
 </div>
 ) : isError ? (
 <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
 <svg
 className="w-4 h-4 text-white"
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
 </div>
 ) : isActive ? (
 <div className="w-6 h-6 rounded-full bg-[#1E4775] flex items-center justify-center animate-pulse">
 <div className="w-2 h-2 rounded-full bg-white"></div>
 </div>
 ) : (
 <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
 <div className="w-2 h-2 rounded-full bg-white"></div>
 </div>
 )}
 </div>

 {/* Step Content */}
 <div className="flex-1 min-w-0">
 <div
 className={`text-sm font-medium ${
 isActive
 ?"text-[#1E4775]"
 : isCompleted
 ?"text-green-700"
 : isError
 ?"text-red-700"
 :"text-gray-500"
 }`}
 >
 {step.label}
 </div>
 {step.details && (
 <div className="text-xs text-[#1E4775]/70 mt-1">
 {step.details}
 </div>
 )}
 {step.fee && (
 <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 text-xs">
 <div className="font-semibold text-yellow-800 mb-1">Fee:</div>
 <div className="space-y-1 text-yellow-700">
 <div className="flex justify-between">
 <span>Amount:</span>
 <span className="font-mono font-semibold">
 {step.fee.formatted} {step.fee.tokenSymbol}
 </span>
 </div>
 {step.fee.percentage !== undefined && (
 <div className="flex justify-between">
 <span>Percentage:</span>
 <span className="font-semibold">
 {step.fee.percentage.toFixed(2)}%
 </span>
 </div>
 )}
 {step.fee.usd !== undefined && (
 <div className="flex justify-between">
 <span>Value:</span>
 <span className="font-semibold">
 ${step.fee.usd.toFixed(2)}
 </span>
 </div>
 )}
 </div>
 </div>
 )}
 {step.txHash && (
 <a
 href={`https://etherscan.io/tx/${step.txHash}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-[#1E4775]/70 hover:text-[#1E4775] mt-1 inline-block underline"
 >
 View on Etherscan
 </a>
 )}
 {step.error && (
 <div className="text-xs text-red-600 mt-1">
 {step.error}
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {steps.every((s) => s.status ==="completed") && (
 <div className="mt-6 p-4 bg-green-50 border border-green-200">
 <p className="text-sm font-medium text-green-800 text-center">
 All transactions completed successfully!
 </p>
 </div>
 )}

 {steps.some((s) => s.status ==="error") && (
 <div className="mt-6 p-4 bg-red-50 border border-red-200">
 <div className="flex items-center justify-center gap-2">
 <AlertOctagon className="w-4 h-4 flex-shrink-0 text-red-600" aria-hidden />
 <p className="text-sm font-medium text-red-800 text-center">
 {errorMessage ||"An error occurred. Please try again."}
 </p>
 </div>
        {onRetry && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm font-medium bg-[#1E4775] text-white rounded-full hover:bg-[#17395F] transition-colors"
            >
              {retryButtonLabel}
            </button>
          </div>
        )}
 </div>
 )}

 {allCompleted && renderSuccessContent && (
 <div className="mt-6">{renderSuccessContent()}</div>
 )}

 {/* Cancel button - only show if canCancel is true and not all steps are completed */}
 {canCancel && !steps.every((s) => s.status ==="completed") && (
 <div className="mt-6 flex justify-end">
 <button
 onClick={onCancel || onClose}
 className="px-4 py-2 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 transition-colors rounded-full"
 >
 Cancel
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

