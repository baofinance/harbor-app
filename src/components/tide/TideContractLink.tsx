"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { TIDE_CONFIG } from "@/config/tide";
import { truncateAddress } from "@/utils/formatters";

export function TideContractLink() {
  const tideAddress = TIDE_CONFIG.tideTokenAddress;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tideAddress);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — ignore silently.
    }
  }, [tideAddress]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] pl-2.5 pr-1 py-1 font-mono text-[11px] text-white/60">
      <span className="font-sans font-semibold uppercase tracking-[0.1em] text-white/45">
        TIDE
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied!" : `Copy contract: ${tideAddress}`}
        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors hover:bg-white/10 hover:text-white/90"
      >
        <span>{truncateAddress(tideAddress)}</span>
        {copied ? (
          <CheckIcon className="h-3 w-3 text-harbor-mint" aria-hidden />
        ) : (
          <ClipboardIcon className="h-3 w-3" aria-hidden />
        )}
        <span className="sr-only">
          {copied ? "Address copied" : "Copy TIDE contract address"}
        </span>
      </button>
      <a
        href={`https://etherscan.io/token/${tideAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        title="View TIDE on Etherscan"
        className="inline-flex items-center rounded-full px-1.5 py-0.5 transition-colors hover:bg-white/10 hover:text-white/90"
      >
        <ArrowTopRightOnSquareIcon className="h-3 w-3" aria-hidden />
        <span className="sr-only">View TIDE on Etherscan</span>
      </a>
    </div>
  );
}
