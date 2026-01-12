"use client";

import React, { useState, useMemo } from "react";

interface PoolPosition {
 marketId: string;
 market: any;
 poolType:"collateral" |"sail";
 rewards: bigint;
 rewardsUSD: number;
 deposit: bigint;
 depositUSD: number;
 rewardTokens: Array<{
 symbol: string;
 claimable: bigint;
 claimableFormatted: string;
 }>;
}

interface AnchorClaimAllModalProps {
 isOpen: boolean;
 onClose: () => void;
 onBasicClaim: (
 selectedPools: Array<{ marketId: string; poolType:"collateral" |"sail" }>
 ) => void;
 onCompound: (
 selectedPools: Array<{ marketId: string; poolType:"collateral" |"sail" }>
 ) => void;
 onBuyTide: (
 selectedPools: Array<{ marketId: string; poolType:"collateral" |"sail" }>
 ) => void;
 positions?: PoolPosition[];
 isLoading?: boolean;
}

export const AnchorClaimAllModal = ({
 isOpen,
 onClose,
 onBasicClaim,
 onCompound,
 onBuyTide,
 positions = [],
 isLoading = false,
}: AnchorClaimAllModalProps) => {
 const [selectedPools, setSelectedPools] = useState<Set<string>>(new Set());

 // Initialize all pools as selected when modal opens
 React.useEffect(() => {
 if (isOpen && positions.length > 0) {
 const allPoolKeys = new Set(
 positions.map((p) => `${p.marketId}-${p.poolType}`)
 );
 setSelectedPools(allPoolKeys);
 }
 }, [isOpen, positions]);

 const togglePool = (marketId: string, poolType:"collateral" |"sail") => {
 const key = `${marketId}-${poolType}`;
 setSelectedPools((prev) => {
 const next = new Set(prev);
 if (next.has(key)) {
 next.delete(key);
 } else {
 next.add(key);
 }
 return next;
 });
 };

 const selectedPoolsArray = useMemo(() => {
 return Array.from(selectedPools).map((key) => {
 // Split from the end to handle marketIds that contain hyphens (e.g.,"pb-steth")
 const lastDashIndex = key.lastIndexOf("-");
 const marketId = key.substring(0, lastDashIndex);
 const poolType = key.substring(lastDashIndex + 1);
 return {
 marketId,
 poolType: poolType as"collateral" |"sail",
 };
 });
 }, [selectedPools]);

 const totalSelectedRewardsUSD = useMemo(() => {
 return positions
 .filter((p) => selectedPools.has(`${p.marketId}-${p.poolType}`))
 .reduce((sum, p) => sum + p.rewardsUSD, 0);
 }, [positions, selectedPools]);

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 <div
 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
 onClick={onClose}
 />

        <div className="relative bg-white shadow-2xl w-full max-w-4xl mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh] rounded-none">
          <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-[#1E4775]/20">
 <h2 className="text-2xl font-bold text-[#1E4775]">Claim Rewards</h2>
 <button
 onClick={onClose}
 className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors"
 disabled={isLoading}
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

 <div className="flex flex-1 overflow-hidden">
 {/* Left Panel - Positions List */}
 <div className="w-1/2 border-r border-[#1E4775]/20 overflow-y-auto">
 <div className="p-4">
 <h3 className="text-lg font-semibold text-[#1E4775] mb-4">
 Select Pools to Claim
 </h3>
 {positions.length === 0 ? (
 <p className="text-sm text-[#1E4775]/70">
 No positions with rewards available.
 </p>
 ) : (
 <div className="space-y-2">
 {positions.map((position) => {
 const key = `${position.marketId}-${position.poolType}`;
 const isSelected = selectedPools.has(key);
 const marketSymbol =
 position.market?.peggedToken?.symbol || position.marketId;

 return (
 <label
 key={key}
 className="flex items-center gap-3 p-3 border border-[#1E4775]/20 hover:bg-[#1E4775]/5 cursor-pointer transition-colors"
 >
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() =>
 togglePool(position.marketId, position.poolType)
 }
 className="w-4 h-4 text-[#1E4775] border-[#1E4775]/30 focus:ring-[#1E4775]"
 disabled={isLoading}
 />
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2 mb-1">
 <span className="text-sm font-semibold text-[#1E4775]">
 {marketSymbol} {position.poolType} pool
 </span>
 <span className="text-sm font-semibold text-[#1E4775]">
 ${position.rewardsUSD.toFixed(2)}
 </span>
 </div>
 <div className="text-xs text-[#1E4775]/70">
 {position.rewardTokens && position.rewardTokens.length > 0 ? (
 position.rewardTokens.map((token, idx) => {
 const amount = parseFloat(token.claimableFormatted);
 return (
 <div key={idx}>
 {amount.toLocaleString(undefined, {
 maximumFractionDigits: amount >= 1 ? 2 : 6,
 minimumFractionDigits: 0,
 })}{""}
 {token.symbol}
 </div>
 );
 })
 ) : (
 <div>No rewards available</div>
 )}
 {position.depositUSD > 0 && (
 <div className="mt-1">
 Position: ${position.depositUSD.toFixed(2)}
 </div>
 )}
 </div>
 </div>
 </label>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* Right Panel - Action Buttons */}
 <div className="w-1/2 p-6 flex flex-col">
 <div className="mb-6">
 <p className="text-sm text-[#1E4775]/80 mb-2">
 Choose how you would like to handle your rewards:
 </p>
 <div className="bg-[#1E4775]/5 p-3">
 <div className="text-xs text-[#1E4775]/70 mb-1">
 Total Selected Rewards
 </div>
 <div className="text-lg font-bold text-[#1E4775] font-mono">
 ${totalSelectedRewardsUSD.toFixed(2)}
 </div>
 </div>
 </div>

 <div className="space-y-3 flex-1">
 {/* Basic Claim */}
 <button
 onClick={() => {
 onBasicClaim(selectedPoolsArray);
 // Close this modal - the progress modal will open
 onClose();
 }}
 disabled={isLoading || selectedPoolsArray.length === 0}
 className="w-full p-4 text-left bg-white border-2 border-[#1E4775] hover:bg-[#1E4775]/5 transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <div className="flex items-center gap-3">
 <div>
 <div className="font-semibold text-[#1E4775]">
 Basic Claim
 </div>
 <p className="text-xs text-[#1E4775]/70 mt-1">
 Receive rewards directly to your wallet
 </p>
 </div>
 </div>
 <svg
 className="w-5 h-5 text-[#1E4775] group-hover:translate-x-1 transition-transform"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M9 5l7 7-7 7"
 />
 </svg>
 </button>

 {/* Compound */}
 <button
 onClick={() => {
 onCompound(selectedPoolsArray);
 }}
 disabled={isLoading || selectedPoolsArray.length === 0}
 className="w-full p-4 text-left bg-white border-2 border-[#1E4775] hover:bg-[#1E4775]/5 transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <div className="flex items-center gap-3">
 <div>
 <div className="font-semibold text-[#1E4775]">Compound</div>
 <p className="text-xs text-[#1E4775]/70 mt-1">
 Automatically reinvest rewards for compound growth
 </p>
 </div>
 </div>
 <svg
 className="w-5 h-5 text-[#1E4775] group-hover:translate-x-1 transition-transform"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M9 5l7 7-7 7"
 />
 </svg>
 </button>

 {/* Buy $Tide */}
 <button
 onClick={() => {
 onBuyTide(selectedPoolsArray);
 onClose();
 }}
 disabled={true}
 className="w-full p-4 text-left bg-white border-2 border-gray-300 transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <div className="flex items-center gap-3">
 <div>
 <div className="font-semibold text-gray-500">
 Buy $TIDE
 </div>
 <p className="text-xs text-gray-400 mt-1">
 $TIDE token is not live yet
 </p>
 </div>
 </div>
 <svg
 className="w-5 h-5 text-gray-400"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M9 5l7 7-7 7"
 />
 </svg>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};
