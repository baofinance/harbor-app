"use client";

import React, { useState, useEffect } from "react";

// Format USD values compactly
function formatCompactUSD(value: number): string {
 if (value === 0) return"$0";
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
 id: string;
 name: string;
 address: `0x${string}`;
 apr?: number;
 tvl?: bigint;
 tvlUSD?: number;
 enabled: boolean;
}

interface PoolAllocation {
 poolAddress: `0x${string}`;
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
 const [selected, setSelected] = useState<Set<string>>(new Set());
 const [percentages, setPercentages] = useState<Map<string, number>>(new Map());

 useEffect(() => {
   if (!isOpen) return;
   // Default: select none; user opts in explicitly.
   setSelected(new Set());
   setPercentages(new Map());
 }, [isOpen]);

 if (!isOpen) return null;

 const totalPct = Array.from(selected).reduce(
   (sum, addr) => sum + (percentages.get(addr) || 0),
   0
 );
 const pctError =
   selected.size > 0 && totalPct !== 100 ? "Percentages must add up to 100%" : null;

 const handleConfirm = () => {
   if (selected.size === 0) return;
   if (pctError) return;
   const allocationArray: PoolAllocation[] = Array.from(selected).map((addr) => ({
     poolAddress: addr as `0x${string}`,
     percentage: percentages.get(addr) || 0,
   }));
 onConfirm(allocationArray);
 };

 const togglePool = (addr: string) => {
   setSelected((prev) => {
     const next = new Set(prev);
     if (next.has(addr)) next.delete(addr);
     else next.add(addr);
     return next;
   });
   setPercentages((prev) => {
     const next = new Map(prev);
     if (selected.has(addr)) {
       // Removing
       next.delete(addr);
     } else {
       // Adding
       next.set(addr, 0);
     }
     return next;
   });
   // If this becomes the only selected pool, auto-set it to 100% for convenience.
   setTimeout(() => {
     setSelected((prevSel) => {
       if (prevSel.size !== 1) return prevSel;
       const only = Array.from(prevSel)[0];
       setPercentages((prevPct) => {
         const nextPct = new Map(prevPct);
         nextPct.set(only, 100);
         return nextPct;
       });
       return prevSel;
     });
   }, 0);
 };

 const setPoolPct = (addr: string, value: number) => {
   const clamped = Math.max(0, Math.min(100, value));
   setPercentages((prev) => new Map(prev).set(addr, clamped));
 };

 return (
 <div className="fixed inset-0 z-[70] flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={onClose}
 />
        <div className="relative bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-none max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
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

 {availablePools.length > 0 && (
   <div className="space-y-2">
     {availablePools.map((p) => {
       const addr = p.address.toLowerCase();
       const isSelected = selected.has(addr);
       const showPct = selected.size > 1 && isSelected;
       const pct = percentages.get(addr) ?? 0;
       return (
         <div key={p.address} className="border border-[#1E4775]/20 p-3">
           <div className="flex items-start justify-between gap-3">
             <label className="flex items-start gap-3 cursor-pointer">
               <input
                 type="checkbox"
                 checked={isSelected}
                 onChange={() => togglePool(addr)}
                 className="mt-1"
               />
               <div className="min-w-0">
                 <div className="font-semibold text-[#1E4775] truncate">
                   {p.name}
 </div>
                 <div className="text-xs text-[#1E4775]/70 mt-1">
                   APR: {p.apr !== undefined ? `${p.apr.toFixed(2)}%` : "—"}
                   {"  "}•{"  "}
                   TVL: {p.tvlUSD !== undefined ? formatCompactUSD(p.tvlUSD) : "—"}
 </div>
 </div>
             </label>

             {showPct && (
               <div className="flex items-center gap-2">
                 <input
                   type="number"
                   min={0}
                   max={100}
                   value={pct}
                   onChange={(e) => setPoolPct(addr, Number(e.target.value))}
                   className="w-20 px-2 py-1 border border-[#1E4775]/30 text-[#1E4775] text-sm"
                 />
                 <span className="text-sm text-[#1E4775]/70">%</span>
 </div>
 )}
 </div>
 </div>
       );
     })}
     {selected.size > 1 && (
 <div className="text-xs text-[#1E4775]/70">
         Total: {totalPct}% {pctError ? <span className="text-rose-600">({pctError})</span> : null}
 </div>
 )}
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
  disabled={availablePools.length === 0 || selected.size === 0 || !!pctError}
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

