"use client";

import React from "react";

export interface TransactionSuccessMessageProps {
  /** Short description (e.g. "Your sail tokens have been minted successfully.") */
  message: string;
  /** Transaction hash for Etherscan link */
  txHash?: string | null;
}

/**
 * Success message with optional Etherscan link. Used across Genesis, Sail, Anchor modals.
 */
export function TransactionSuccessMessage({
  message,
  txHash,
}: TransactionSuccessMessageProps) {
  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">✓</div>
      <h3 className="text-xl font-bold text-[#1E4775] mb-2">
        Transaction Successful!
      </h3>
      <p className="text-sm text-[#1E4775]/70 mb-4">{message}</p>
      {txHash && (
        <a
          href={`https://etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#1E4775] hover:underline"
        >
          View transaction on Etherscan
        </a>
      )}
    </div>
  );
}
