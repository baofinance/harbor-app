"use client";

import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { DEFAULT_FDV } from "@/utils/tokenAllocation";
import { calculateTideAPR, TideAPRBreakdown } from "@/utils/tideAPR";

interface TideAPRTooltipProps {
  underlyingAPR: number | null; // Underlying asset APR (e.g., 7% for fxSAVE)
  userMarks: number; // User's maiden voyage marks for this market
  totalMarks: number; // Total maiden voyage marks across all users
  userDepositUSD: number; // User's current deposit in this market (USD)
  totalGenesisTVL: number; // Total genesis deposits TVL
  genesisDays: number; // Genesis period duration in days
  fdv?: number; // Optional FDV from parent (if not provided, uses internal state)
  onFdvChange?: (fdv: number) => void; // Optional callback to update parent FDV
  aprBreakdown?: TideAPRBreakdown; // Optional breakdown of $TIDE APR by component
  children: React.ReactNode; // Trigger element
}

export default function TideAPRTooltip({
  underlyingAPR,
  userMarks,
  totalMarks,
  userDepositUSD,
  totalGenesisTVL,
  genesisDays,
  fdv: fdvProp,
  onFdvChange,
  aprBreakdown,
  children,
}: TideAPRTooltipProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isFDVModalOpen, setIsFDVModalOpen] = useState(false);
  const [internalFdv, setInternalFdv] = useState(DEFAULT_FDV);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  
  // Use prop FDV if provided, otherwise use internal state
  const fdv = fdvProp !== undefined ? fdvProp : internalFdv;
  
  const setFdv = (value: number) => {
    if (onFdvChange) {
      onFdvChange(value);
    } else {
      setInternalFdv(value);
    }
  };

  // Calculate $TIDE APR with current FDV
  const tideAPR = calculateTideAPR(
    userMarks,
    totalMarks,
    userDepositUSD,
    totalGenesisTVL,
    genesisDays,
    fdv
  );

  // Debug: Log breakdown in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[TideAPRTooltip] aprBreakdown prop:', aprBreakdown, 'isTruthy:', !!aprBreakdown);
    if (aprBreakdown) {
      console.log('[TideAPRTooltip] Breakdown values:', {
        depositAPR: aprBreakdown.depositAPR,
        endBonusAPR: aprBreakdown.endBonusAPR,
        earlyBonusAPR: aprBreakdown.earlyBonusAPR,
        totalAPR: aprBreakdown.totalAPR
      });
    }
  }

  // underlyingAPR is in decimal form (0.0692 for 6.92%), tideAPR is in percentage (521.4 for 521.4%)
  // Convert underlyingAPR to percentage for consistency
  const combinedAPR = ((underlyingAPR || 0) * 100) + tideAPR;

  // Position tooltip
  useEffect(() => {
    if (isTooltipVisible && triggerRef.current && tooltipRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      
      // Force a layout calculation to get actual tooltip dimensions
      const tooltipRect = tooltip.getBoundingClientRect();
      const tooltipHeight = tooltipRect.height || 200;
      
      // Check if there's enough space below
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Position vertically: prefer below, but use above if not enough space
      if (spaceBelow >= tooltipHeight + 8 || spaceBelow >= spaceAbove) {
        // Position below
        tooltip.style.top = `${rect.bottom + 8}px`;
      } else {
        // Position above
        tooltip.style.top = `${rect.top - tooltipHeight - 8}px`;
      }
      
      // Position horizontally: align to left, but adjust if it would overflow
      let leftPosition = rect.left;
      const tooltipWidth = tooltipRect.width || 280;
      
      // Check if tooltip would overflow on the right
      if (leftPosition + tooltipWidth > window.innerWidth) {
        leftPosition = window.innerWidth - tooltipWidth - 16; // 16px padding from edge
      }
      
      // Ensure it doesn't go off the left edge
      if (leftPosition < 16) {
        leftPosition = 16;
      }
      
      tooltip.style.left = `${leftPosition}px`;
    }
  }, [isTooltipVisible]);

  // Close modal when clicking outside
  useEffect(() => {
    if (isFDVModalOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const modal = document.getElementById("fdv-modal");
        if (modal && !modal.contains(e.target as Node)) {
          setIsFDVModalOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isFDVModalOpen]);

  const handleFDVInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setFdv(value);
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        className="relative inline-flex items-center group"
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        {children}
      </span>

      {isTooltipVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] bg-gray-900 px-4 py-3 text-sm text-white shadow-xl border border-gray-700 min-w-[280px] pointer-events-auto"
          onMouseEnter={() => setIsTooltipVisible(true)}
          onMouseLeave={() => setIsTooltipVisible(false)}
        >
          <div className="space-y-2">
            <div className="font-semibold mb-2 text-white">APR Breakdown</div>
            
            {underlyingAPR !== null && (
              <div className="flex justify-between items-center">
                <span className="text-white/80">Underlying Asset APR:</span>
                <span className="text-white font-semibold">
                  {(underlyingAPR * 100).toFixed(2)}%
                </span>
              </div>
            )}

            {/* $TIDE APR Breakdown */}
            {aprBreakdown && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="text-xs font-semibold text-white/90 mb-2">Est. $TIDE APRs</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Deposit:</span>
                    <span className="text-white font-medium">
                      {aprBreakdown.depositAPR?.toFixed(2) ?? '0.00'}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">End Bonus:</span>
                    <span className="text-white font-medium">
                      {aprBreakdown.endBonusAPR?.toFixed(2) ?? '0.00'}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Early Bonus:</span>
                    <span className="text-white font-medium">
                      {aprBreakdown.earlyBonusAPR?.toFixed(2) ?? '0.00'}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-white/10">
                    <span className="text-white font-semibold">TOTAL:</span>
                    <span className="text-white font-bold">
                      {aprBreakdown.totalAPR?.toFixed(2) ?? '0.00'}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-white/60 mt-2 pt-2 border-t border-white/20">
              Based on ${(fdv / 1_000_000).toFixed(1)}M FDV
            </div>
          </div>
        </div>
      )}

      {isFDVModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div
            id="fdv-modal"
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1E4775]">
                Adjust FDV for $TIDE APR
              </h3>
              <button
                onClick={() => setIsFDVModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E4775] mb-2">
                  Fully Diluted Valuation (FDV)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[#1E4775]">$</span>
                  <input
                    type="number"
                    value={fdv}
                    onChange={handleFDVInputChange}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-[#1E4775] focus:outline-none focus:ring-2 focus:ring-[#1E4775]"
                    placeholder="10000000"
                    min="1"
                    step="100000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Default: $10M (1B tokens × $0.01)
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Underlying Asset APR:</span>
                    <span className="font-semibold text-[#1E4775]">
                      {underlyingAPR !== null
                        ? `${(underlyingAPR * 100).toFixed(2)}%`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Estimated $TIDE APR:</span>
                    <span className="font-semibold text-[#1E4775]">
                      {calculateTideAPR(
                        userMarks,
                        totalMarks,
                        userDepositUSD,
                        totalGenesisTVL,
                        genesisDays,
                        fdv
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-700">
                      Combined APR:
                    </span>
                    <span className="font-bold text-[#1E4775] text-base">
                      {(
                        ((underlyingAPR || 0) * 100) +
                        calculateTideAPR(
                          userMarks,
                          totalMarks,
                          userDepositUSD,
                          totalGenesisTVL,
                          genesisDays,
                          fdv
                        )
                      ).toFixed(2)}
                      %
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsFDVModalOpen(false)}
                className="w-full py-2 bg-[#1E4775] text-white rounded-md hover:bg-[#17395F] transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

