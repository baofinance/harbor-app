"use client";

import React, { useState, useEffect } from "react";

// Format USD values compactly
function formatCompactUSD(value: number): string {
  if (value === 0) return "$0";
  if (value < 0) return `-${formatCompactUSD(-value)}`;

  const absValue = Math.abs(value);

  if (absValue >= 1e9) {
    return `$${(absValue / 1e9).toFixed(2)}b`;
  }
  if (absValue >= 1e6) {
    return `$${(absValue / 1e6).toFixed(2)}m`;
  }
  if (absValue >= 1e3) {
    return `$${(absValue / 1e3).toFixed(2)}k`;
  }

  return `$${absValue.toFixed(2)}`;
}

export interface PoolOption {
  id: "collateral" | "sail";
  name: string;
  address: `0x${string}`;
  apr?: number;
  tvl?: bigint;
  tvlUSD?: number;
  enabled: boolean;
}

interface PoolAllocation {
  poolId: "collateral" | "sail";
  percentage: number;
}

interface CompoundPoolSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (allocations: PoolAllocation[]) => void;
  pools: PoolOption[];
  marketSymbol: string;
}

export const CompoundPoolSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  pools,
  marketSymbol,
}: CompoundPoolSelectionModalProps) => {
  const availablePools = pools.filter((p) => p.enabled);
  
  // Initialize with 50/50 split if 2 pools, 100% if 1 pool
  const [allocations, setAllocations] = useState<Map<"collateral" | "sail", number>>(() => {
    const map = new Map();
    if (availablePools.length === 1) {
      map.set(availablePools[0].id, 100);
    } else if (availablePools.length === 2) {
      map.set(availablePools[0].id, 50);
      map.set(availablePools[1].id, 50);
    }
    return map;
  });

  useEffect(() => {
    // Reset allocations when modal opens
    if (isOpen) {
      const map = new Map();
      if (availablePools.length === 1) {
        map.set(availablePools[0].id, 100);
      } else if (availablePools.length === 2) {
        map.set(availablePools[0].id, 50);
        map.set(availablePools[1].id, 50);
      }
      setAllocations(map);
    }
  }, [isOpen, availablePools.length]);

  if (!isOpen) return null;

  console.log("[CompoundPoolSelectionModal] Rendering with:", {
    isOpen,
    poolsCount: pools.length,
    availablePoolsCount: availablePools.length,
    marketSymbol,
    allocations: Object.fromEntries(allocations),
  });

  const handleSliderChange = (value: number) => {
    if (availablePools.length !== 2) return;
    
    // Reverse the slider value: slider at 0 (left) = 100% collateral, slider at 100 (right) = 0% collateral
    const newAllocations = new Map(allocations);
    newAllocations.set("collateral", 100 - value);
    newAllocations.set("sail", value);
    setAllocations(newAllocations);
  };

  const handleConfirm = () => {
    console.log("[CompoundPoolSelectionModal] handleConfirm called");
    console.log("[CompoundPoolSelectionModal] allocations:", Object.fromEntries(allocations));
    const allocationArray: PoolAllocation[] = Array.from(allocations.entries()).map(([poolId, percentage]) => ({
      poolId,
      percentage,
    }));
    console.log("[CompoundPoolSelectionModal] allocationArray:", allocationArray);
    onConfirm(allocationArray);
  };

  const collateralPool = availablePools.find(p => p.id === "collateral");
  const sailPool = availablePools.find(p => p.id === "sail");
  const collateralPercentage = allocations.get("collateral") || 0;
  const sailPercentage = allocations.get("sail") || 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-[#1E4775]/20">
          <h2 className="text-xl font-bold text-[#1E4775]">Select Pools to Compound To</h2>
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
          <p className="text-sm text-[#1E4775]/80">
            Choose how to split your rewards between the available stability pools.
          </p>

          {availablePools.length === 0 && (
            <div className="text-center py-8 text-sm text-[#1E4775]/70">
              No pools available for this market.
            </div>
          )}

          {availablePools.length === 1 && collateralPool && (
            <div className="p-4 border-2 border-[#1E4775] bg-[#1E4775]/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-[#1E4775]">
                    {collateralPool.name}
                  </div>
                  {collateralPool.apr !== undefined && (
                    <div className="text-sm text-[#1E4775]/70 mt-0.5">
                      APR: {collateralPool.apr.toFixed(2)}%
                    </div>
                  )}
                  {collateralPool.tvlUSD !== undefined && (
                    <div className="text-sm text-[#1E4775]/70 mt-0.5">
                      TVL: {formatCompactUSD(collateralPool.tvlUSD)}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-[#1E4775]">
                  100%
                </div>
              </div>
            </div>
          )}

          {availablePools.length === 2 && collateralPool && sailPool && (
            <div className="space-y-4">
              {/* Single Slider with Pools on Each Side */}
              <div className="p-4 border-2 border-[#1E4775] bg-[#1E4775]/5 rounded-lg">
                <div className="flex items-start justify-between mb-4 gap-4">
                  {/* Left Pool (Collateral) */}
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-[#1E4775] text-sm mb-1">
                      {collateralPool.name}
                    </div>
                    {collateralPool.apr !== undefined && (
                      <div className="text-xs text-[#1E4775]/70">
                        APR: {collateralPool.apr.toFixed(2)}%
                      </div>
                    )}
                    {collateralPool.tvlUSD !== undefined && (
                      <div className="text-xs text-[#1E4775]/70">
                        TVL: {formatCompactUSD(collateralPool.tvlUSD)}
                      </div>
                    )}
                    <div className="text-2xl font-bold text-[#1E4775] mt-2">
                      {collateralPercentage}%
                    </div>
                  </div>

                  {/* Right Pool (Sail) */}
                  <div className="flex-1 text-right">
                    <div className="font-semibold text-[#1E4775] text-sm mb-1">
                      {sailPool.name}
                    </div>
                    {sailPool.apr !== undefined && (
                      <div className="text-xs text-[#1E4775]/70">
                        APR: {sailPool.apr.toFixed(2)}%
                      </div>
                    )}
                    {sailPool.tvlUSD !== undefined && (
                      <div className="text-xs text-[#1E4775]/70">
                        TVL: {formatCompactUSD(sailPool.tvlUSD)}
                      </div>
                    )}
                    <div className="text-2xl font-bold text-[#1E4775] mt-2">
                      {sailPercentage}%
                    </div>
                  </div>
                </div>

                {/* Single Slider */}
                <div className="relative mt-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sailPercentage}
                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                    className="w-full h-3 bg-[#1E4775]/20 rounded-lg appearance-none cursor-pointer accent-[#1E4775]"
                    style={{
                      background: `linear-gradient(to right, #1E4775 0%, #1E4775 ${sailPercentage}%, rgba(30, 71, 117, 0.2) ${sailPercentage}%, rgba(30, 71, 117, 0.2) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium bg-white text-[#1E4775] border border-[#1E4775] hover:bg-[#1E4775]/5 transition-colors rounded-full"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={availablePools.length === 0}
              className="flex-1 px-4 py-2 text-sm font-medium bg-[#1E4775] text-white hover:bg-[#17395F] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors rounded-full"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

