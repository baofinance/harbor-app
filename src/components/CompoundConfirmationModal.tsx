"use client";

import React from "react";
import { TransactionStep } from "./TransactionProgressModal";

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
}

export const CompoundConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  steps,
  fees,
}: CompoundConfirmationModalProps) => {
  if (!isOpen) return null;

  const totalFeeUSD = fees.reduce((sum, fee) => sum + (fee.feeUSD || 0), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white shadow-2xl w-full max-w-lg mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#1E4775]/20">
          <h2 className="text-xl font-bold text-[#1E4775]">Compound Rewards Summary</h2>
          <button
            onClick={onClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
          >
            <svg
              className="w-5 h-5"
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

        <div className="p-4 space-y-4">
          {/* Transaction Steps */}
          <div>
            <h3 className="text-xs font-semibold text-[#1E4775] mb-2">
              Transaction Steps
            </h3>
            <div className="space-y-2">
              {steps.map((step, index) => {
                // Find fee for this step - check step.fee first, then fees array
                let stepFee: FeeInfo | undefined = undefined;
                
                // First check if fee is attached directly to the step
                if (step.fee) {
                  stepFee = {
                    feeAmount: step.fee.amount,
                    feeFormatted: step.fee.formatted,
                    feeUSD: step.fee.usd,
                    feePercentage: step.fee.percentage,
                    tokenSymbol: step.fee.tokenSymbol,
                    label: step.id === "redeem" ? "Redeem Leveraged Tokens" : step.id === "mint" ? "Mint Pegged Tokens" : "",
                  };
                } else {
                  // Fallback to fees array
                  stepFee = fees.find((f) => {
                    if (step.id === "redeem") {
                      return f.label === "Redeem Leveraged Tokens";
                    } else if (step.id === "mint") {
                      return f.label === "Mint Pegged Tokens";
                    }
                    return false;
                  });
                }

                return (
                  <div key={step.id} className="border border-[#1E4775]/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-[#1E4775] flex items-center justify-center text-xs text-white font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-xs font-medium text-[#1E4775]">
                        {step.label}
                      </span>
                    </div>
                    {step.details && (
                      <div className="text-xs text-[#1E4775]/70 ml-7 mb-1">
                        {step.details}
                      </div>
                    )}
                    {stepFee && (
                      <div className="ml-7 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <div className="font-semibold text-yellow-800 mb-1">Fee Information:</div>
                        <div className="text-yellow-700 text-xs">
                          {stepFee.feePercentage !== undefined && (
                            <span className="font-semibold text-yellow-800">
                              {stepFee.feePercentage.toFixed(2)}% -{" "}
                            </span>
                          )}
                          {stepFee.feeFormatted} {stepFee.tokenSymbol}
                          {stepFee.feeUSD !== undefined && stepFee.feeUSD > 0 && (
                            <span className="text-yellow-600 ml-1">
                              (${stepFee.feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
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
          {fees.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-yellow-800 mb-2">
                Total Fees Summary
              </h3>
              <div className="space-y-1.5 text-xs text-yellow-700">
                {fees.map((fee, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{fee.label}:</span>
                    <span className="font-semibold">
                      {fee.feePercentage !== undefined && `${fee.feePercentage.toFixed(2)}% - `}
                      {fee.feeFormatted} {fee.tokenSymbol}
                      {fee.feeUSD !== undefined && fee.feeUSD > 0 && (
                        <span className="text-yellow-600 ml-1">
                          (${fee.feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                {fees.length > 1 && totalFeeUSD > 0 && (
                  <div className="pt-1.5 border-t border-yellow-300 mt-1.5">
                    <div className="flex justify-between font-semibold text-yellow-800">
                      <span>Total Fee Value:</span>
                      <span>${totalFeeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Show message if fees couldn't be calculated
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-blue-800 mb-1.5">
                Fee Information
              </h3>
              <p className="text-xs text-blue-700">
                Fees will be calculated and displayed during the transaction. Minting and redemption operations may include fees that will be shown when you approve each step.
              </p>
            </div>
          )}

          <p className="text-xs text-[#1E4775]/80">
            Review the transaction steps and fees above. Click "Continue" to proceed with the compound process.
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 text-xs font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 transition-colors rounded-full"
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

