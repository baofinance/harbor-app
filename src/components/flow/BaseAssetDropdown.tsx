"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import TokenIcon from "@/components/TokenIcon";
import { getLogoPath } from "@/lib/logos";

interface BaseAssetDropdownProps {
  selectedBaseAsset: string | null;
  availableAssets: string[];
  onSelect: (asset: string | null) => void;
}

export function BaseAssetDropdown({
  selectedBaseAsset,
  availableAssets,
  onSelect,
}: BaseAssetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1 bg-white border border-[#1E4775]/20 text-[#1E4775] hover:bg-[#1E4775]/5 transition-colors text-xs h-[28px]"
      >
        <div className="flex items-center gap-2">
          {selectedBaseAsset ? (
            <>
              <TokenIcon
                src={getLogoPath(selectedBaseAsset)}
                alt={selectedBaseAsset}
                width={14}
                height={14}
                className="rounded-full flex-shrink-0"
              />
              <span className="font-medium text-xs">{selectedBaseAsset}</span>
            </>
          ) : (
            <span className="text-xs text-[#1E4775]/60">Select Base Asset</span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-[#1E4775]/60 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#1E4775]/20 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-2 py-1 hover:bg-[#1E4775]/5 transition-colors text-xs ${
                !selectedBaseAsset ? "bg-[#1E4775]/10" : ""
              }`}
            >
              <span className="text-[#1E4775]/60">All Base Assets</span>
            </button>
            {availableAssets.map((asset) => (
              <button
                key={asset}
                onClick={() => {
                  onSelect(asset);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-1.5 px-2 py-1 hover:bg-[#1E4775]/5 transition-colors text-xs ${
                  selectedBaseAsset === asset ? "bg-[#1E4775]/10" : ""
                }`}
              >
                <TokenIcon
                  src={getLogoPath(asset)}
                  alt={asset}
                  width={14}
                  height={14}
                  className="rounded-full flex-shrink-0"
                />
                <span className="text-[#1E4775] font-medium">{asset}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
