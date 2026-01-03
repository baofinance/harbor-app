"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { NETWORKS, type Network } from "@/config/networks";
import NetworkIconClient from "@/components/NetworkIconClient";

interface ChainDropdownProps {
  selectedNetwork: Network | null;
  onSelect: (network: Network | null) => void;
}

const networkLabels: Record<Network, string> = {
  mainnet: "ETH Mainnet",
  arbitrum: "Arbitrum",
  base: "Base",
};

const networkIconNames: Record<Network, string> = {
  mainnet: "Ethereum",
  arbitrum: "Arbitrum",
  base: "Base",
};

export function ChainDropdown({ selectedNetwork, onSelect }: ChainDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border border-[#1E4775]/20 text-[#1E4775] hover:bg-[#1E4775]/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {selectedNetwork ? (
            <>
              <div className="w-5 h-5 flex items-center justify-center">
                <NetworkIconClient
                  name={networkIconNames[selectedNetwork]}
                  size={20}
                  variant="branded"
                />
              </div>
              <span className="font-medium">{networkLabels[selectedNetwork]}</span>
            </>
          ) : (
            <span className="text-[#1E4775]/60">Select Chain</span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-[#1E4775]/60 transition-transform ${
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
          <div className="absolute z-20 mt-2 w-full bg-white border border-[#1E4775]/20 shadow-lg overflow-hidden">
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-[#1E4775]/5 transition-colors ${
                !selectedNetwork ? "bg-[#1E4775]/10" : ""
              }`}
            >
              <span className="text-[#1E4775]/60">All Chains</span>
            </button>
            {NETWORKS.map((network) => (
              <button
                key={network}
                onClick={() => {
                  onSelect(network);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-[#1E4775]/5 transition-colors ${
                  selectedNetwork === network ? "bg-[#1E4775]/10" : ""
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <NetworkIconClient
                    name={networkIconNames[network]}
                    size={20}
                    variant="branded"
                  />
                </div>
                <span className="text-[#1E4775] font-medium">
                  {networkLabels[network]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
