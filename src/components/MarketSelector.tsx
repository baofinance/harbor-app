"use client";

import { useState, useRef, useEffect } from "react";
import { markets } from "../config/markets";

interface MarketSelectorProps {
  selectedMarketId: string;
  onMarketChange: (marketId: string) => void;
}

export default function MarketSelector({
  selectedMarketId,
  onMarketChange,
}: MarketSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableMarkets = Object.entries(markets).map(([id, market]) => ({
    id,
    ...market,
  }));
  const selectedMarket = markets[selectedMarketId as keyof typeof markets];

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

  const handleMarketSelect = (marketId: string) => {
    onMarketChange(marketId);
    setIsOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      live: "text-harbor bg-harbor/10",
      genesis: "text-harbor bg-harbor/10",
      coming_soon: "text-yellow-400 bg-yellow-400/10",
      archived: "text-gray-400 bg-gray-400/10",
    };

    return (
      <span
        className={`inline-block text-xs px-1.5 py-0.5 font-bold ${
          statusStyles[status as keyof typeof statusStyles] ||
          statusStyles.archived
        }`}
      >
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 text-4xl font-semibold font-geo text-white hover:text-zinc-300 transition-colors"
      >
        <span>{selectedMarket?.name || "Select Market"}</span>
        <svg
          className={`w-6 h-6 text-zinc-400 transition-transform ${
            isOpen ? "rotate-180" : ""
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

      {/* Dropdown Menu */}
      <div
        className={`absolute z-10 mt-2 w-[300px] origin-top-left left-0 bg-gray-900 border border-gray-700 rounded shadow-xl focus:outline-none transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="p-1 max-h-80 overflow-y-auto">
          {availableMarkets.length === 0 ? (
            <div className="p-4 text-center text-zinc-400">
              No markets available
            </div>
          ) : (
            availableMarkets.map((market) => (
              <button
                key={market.id}
                onClick={() => handleMarketSelect(market.id)}
                className="w-full p-3 text-left hover:bg-gray-800 transition-colors flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-base">
                      {market.name}
                    </span>
                    {getStatusBadge(market.status)}
                  </div>
                  <div className="text-sm text-zinc-400">
                    <div className="flex items-center gap-4">
                      <span>wstETH</span>
                      <span className="text-zinc-600">•</span>
                      <span>{market.peggedToken.name}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{market.leveragedToken.name}</span>
                    </div>
                  </div>
                </div>

                {selectedMarketId === market.id && (
                  <svg
                    className="w-5 h-5 text-white ml-3 flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
