"use client";

import React from "react";

const ETHERSCAN_TX_URL = "https://etherscan.io/tx";

/**
 * Truncate tx hash for display (e.g. "0x1234...abcd").
 */
export function formatTxHashShort(hash: string): string {
  if (!hash || hash.length < 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

interface TxLinkProps {
  hash: string;
  className?: string;
  /** Override truncated display (default: formatTxHashShort(hash)). */
  children?: React.ReactNode;
}

/**
 * Etherscan transaction link with truncated hash. Use in modals, admin, etc.
 */
export function TxLink({ hash, className = "", children }: TxLinkProps) {
  if (!hash) return null;
  return (
    <a
      href={`${ETHERSCAN_TX_URL}/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className || "underline hover:text-[#1E4775]"}
    >
      {children ?? formatTxHashShort(hash)}
    </a>
  );
}
