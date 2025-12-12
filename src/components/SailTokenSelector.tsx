"use client";

import { useState, useRef, useEffect } from"react";
import { markets } from"../config/markets";

interface SailTokenSelectorProps {
 selectedMarketId: string;
 onMarketChange: (marketId: string) => void;
}

export default function SailTokenSelector({
 selectedMarketId,
 onMarketChange,
}: SailTokenSelectorProps) {
 const [isOpen, setIsOpen] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Get all markets with their leveraged tokens
 const sailTokens = Object.entries(markets).map(([id, market]) => ({
 id,
 marketId: id,
 symbol: market.leveragedToken.symbol,
 name: market.leveragedToken.name,
 description: market.leveragedToken.description,
 marketName: market.name,
 ...market,
 }));

 const selectedToken = sailTokens.find((t) => t.id === selectedMarketId);

 // Close dropdown when clicking outside
 useEffect(() => {
 function handleClickOutside(event: MouseEvent) {
 if (
 dropdownRef.current &&
 !dropdownRef.current.contains(event.target as Node)
 ) {
 setIsOpen(false);
 }
 }

 document.addEventListener("mousedown", handleClickOutside);
 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 };
 }, []);

 const handleTokenSelect = (marketId: string) => {
 onMarketChange(marketId);
 setIsOpen(false);
 };

 return (
 <div className="relative" ref={dropdownRef}>
 <button
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 className="w-full min-w-[260px] flex items-center justify-between px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-colors"
 >
 <div className="flex items-center gap-2">
 <span className="font-mono">
 {selectedToken ? selectedToken.symbol :"Select Sail Token"}
 </span>
 {selectedToken && (
 <span className="text-white/60 text-xs">
 {selectedToken.description}
 </span>
 )}
 </div>
 <svg
 className={`w-4 h-4 transition-transform ${
 isOpen ?"rotate-180" :""
 }`}
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M19 9l-7 7-7-7"
 />
 </svg>
 </button>

 {isOpen && (
 <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 shadow-xl max-h-60 overflow-auto">
 {sailTokens.map((token) => (
 <button
 key={token.id}
 type="button"
 onClick={() => handleTokenSelect(token.id)}
 className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors ${
 selectedMarketId === token.id ?"bg-white/10" :""
 }`}
 >
 <div className="flex items-center justify-between">
 <div>
 <div className="font-mono text-white font-medium">
 {token.symbol}
 </div>
 <div className="text-xs text-white/60 mt-0.5">
 {token.description}
 </div>
 <div className="text-xs text-white/40 mt-0.5">
 {token.marketName}
 </div>
 </div>
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 );
}




