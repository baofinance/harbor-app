"use client";

import React from "react";

interface EtherscanLinkProps {
 label: string;
 address?: string;
 className?: string;
 showLabel?: boolean;
}

/**
 * Reusable component for displaying Etherscan links
 */
export function EtherscanLink({
 label,
 address,
 className ="",
 showLabel = true,
}: EtherscanLinkProps) {
 if (!address) return null;

 const etherscanBaseUrl ="https://etherscan.io/address/";

 return (
 <div
 className={`flex justify-between items-center text-xs py-0.5 border-b border-[#1E4775]/20 last:border-b-0 ${className}`}
 >
 {showLabel && <span className="text-[#1E4775]/70">{label}</span>}
 <a
 href={`${etherscanBaseUrl}${address}`}
 target="_blank"
 rel="noopener noreferrer"
 className="font-mono text-[#1E4775] hover:underline flex items-center gap-1"
 >
 {`${address.slice(0, 6)}...${address.slice(-4)}`}
 <ExternalLinkIcon className="h-3 w-3" />
 </a>
 </div>
 );
}

function ExternalLinkIcon({ className }: { className?: string }) {
 return (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 className={className}
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
 );
}

export default EtherscanLink;
