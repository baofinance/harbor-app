"use client";

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { GenesisDepositModal } from "./GenesisDepositModal";
import { GenesisWithdrawModal } from "./GenesisWithdrawModal";
import { useContractRead } from "wagmi";
import { useAccount } from "wagmi";
import { getAcceptedDepositAssets } from "@/utils/markets";
import { getLogoPath } from "@/lib/logos";

interface GenesisManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  market: any;
  initialTab?: "deposit" | "withdraw";
  onSuccess?: () => void;
}

const genesisABI = [
  {
    inputs: [{ name: "depositor", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "genesisIsEnded",
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const GenesisManageModal = ({
  isOpen,
  onClose,
  marketId,
  market,
  initialTab = "deposit",
  onSuccess,
}: GenesisManageModalProps) => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">(initialTab);
  
  // Delay contract reads until modal is fully mounted to avoid fetch errors
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is fully mounted
      const timer = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  const genesisAddress = market?.addresses?.genesis as `0x${string}` | undefined;
  // Use wrappedCollateralToken as it points to the deposited token for all markets
  const collateralAddress = market?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
  const collateralSymbol = market?.collateral?.symbol || "TOKEN";
  const priceOracleAddress = market?.addresses?.collateralPrice as string | undefined;

  // Validate addresses
  const isValidGenesisAddress = 
    genesisAddress && 
    typeof genesisAddress === 'string' &&
    genesisAddress.startsWith("0x") && 
    genesisAddress.length === 42;

  const isValidCollateralAddress = 
    collateralAddress && 
    typeof collateralAddress === 'string' &&
    collateralAddress.startsWith("0x") && 
    collateralAddress.length === 42;

  // Fetch user's deposit balance (with error handling)
  const { data: userDeposit, error: depositError, isLoading: depositLoading } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: genesisABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidGenesisAddress && isOpen && mounted,
      retry: 1,
      retryDelay: 1000,
      allowFailure: true, // Don't throw on network errors
    },
  });

  // Check if genesis has ended (with error handling)
  const { data: isEnded, error: endedError, isLoading: endedLoading } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: genesisABI,
    functionName: "genesisIsEnded",
    query: {
      enabled: isValidGenesisAddress && isOpen && mounted,
      retry: 1,
      retryDelay: 1000,
      allowFailure: true, // Don't throw on network errors
    },
  });

  const acceptedAssets = getAcceptedDepositAssets(market);
  const hasDeposit = userDeposit && userDeposit > 0n;

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleTabChange = (tab: "deposit" | "withdraw") => {
    setActiveTab(tab);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        className="relative bg-white shadow-2xl w-full max-w-md mx-2 sm:mx-4 animate-in fade-in-0 scale-in-95 duration-200 rounded-none max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        style={{ borderRadius: 0 }}
      >
        {/* Protocol and Market Header */}
        {market?.peggedToken?.symbol && (
          <div className="bg-[#1E4775] text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between">
            <div className="text-sm sm:text-base font-semibold">
              Genesis
            </div>
            <div className="flex items-center gap-2">
              <img
                src={market?.peggedToken?.icon ?? getLogoPath(market?.peggedToken?.symbol ?? "")}
                alt={market?.peggedToken?.symbol ?? ""}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
              />
              <span className="text-sm sm:text-base font-bold">
                {market.peggedToken.symbol}
              </span>
              {market?.leveragedToken?.symbol && (
                <>
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-white" strokeWidth={3} aria-hidden />
                  <img
                    src={(market.leveragedToken as { icon?: string })?.icon ?? getLogoPath(market.leveragedToken.symbol)}
                    alt={market.leveragedToken.symbol}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
                  />
                  <span className="text-sm sm:text-base font-bold">
                    {market.leveragedToken.symbol}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Header with tabs */}
        <div className="flex items-center justify-between p-0 pt-2 sm:pt-3 px-2 sm:px-3 border-b border-[#1E4775]/10">
          <div className="flex flex-1 mr-2 sm:mr-4 border border-[#1E4775]/20 border-b-0 overflow-hidden">
            <button
              onClick={() => handleTabChange("deposit")}
              disabled={isEnded}
              className={`flex-1 py-2 sm:py-3 text-sm sm:text-base font-semibold transition-colors touch-target ${
                activeTab === "deposit"
                  ? "bg-[#1E4775] text-white"
                  : "bg-[#eef1f7] text-[#4b5a78]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Deposit
            </button>
            <button
              onClick={() => handleTabChange("withdraw")}
              disabled={!hasDeposit}
              className={`flex-1 py-2 sm:py-3 text-sm sm:text-base font-semibold transition-colors touch-target ${
                activeTab === "withdraw"
                  ? "bg-[#1E4775] text-white"
                  : "bg-[#eef1f7] text-[#4b5a78]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Withdraw
            </button>
          </div>
          <button
            onClick={handleClose}
            className="text-[#1E4775]/50 hover:text-[#1E4775] transition-colors flex-shrink-0 touch-target flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content - Show forms directly without modal wrapper */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {!isValidGenesisAddress || !isValidCollateralAddress ? (
            <div className="text-center text-[#1E4775]/60 py-8">
              <p className="font-semibold mb-2">Invalid Market Configuration</p>
              <p className="text-xs">
                Genesis: {genesisAddress || "Not set"}<br/>
                Collateral: {collateralAddress || "Not set"}
              </p>
            </div>
          ) : depositError || endedError ? (
            <div className="text-center py-8">
              <p className="font-semibold mb-2 text-red-600">Error Loading Market Data</p>
              <p className="text-sm text-[#1E4775]/60 mb-4">
                {depositError?.message || endedError?.message || "Network error. Please check your connection and try again."}
              </p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-[#1E4775] text-white rounded-full hover:bg-[#17395F] transition-colors touch-target"
              >
                Close
              </button>
            </div>
          ) : depositLoading || endedLoading ? (
            <div className="text-center text-[#1E4775]/60 py-8">
              <div className="animate-pulse">Loading market data...</div>
            </div>
          ) : activeTab === "deposit" && !isEnded && isValidGenesisAddress && isValidCollateralAddress ? (
            <GenesisDepositModal
              isOpen={true}
              onClose={handleClose}
              genesisAddress={genesisAddress}
              collateralAddress={collateralAddress}
              collateralSymbol={collateralSymbol}
              wrappedCollateralSymbol={
                // collateral.symbol is now always the wrapped/deposited token (fxSAVE or wstETH)
                collateralSymbol
              }
              underlyingSymbol={market?.collateral?.underlyingSymbol}
              acceptedAssets={acceptedAssets}
              marketAddresses={{
                collateralToken: market?.addresses?.collateralToken,
                wrappedCollateralToken: market?.addresses?.wrappedCollateralToken,
                priceOracle: market?.addresses?.collateralPrice,
                genesisZap: market?.addresses?.genesisZap,
                peggedTokenZap: market?.addresses?.peggedTokenZap,
                leveragedTokenZap: market?.addresses?.leveragedTokenZap,
              }}
              coinGeckoId={market?.coinGeckoId}
              peggedTokenSymbol={market?.peggedToken?.symbol}
              onSuccess={onSuccess}
              embedded={true}
            />
          ) : activeTab === "withdraw" && genesisAddress && hasDeposit ? (
            <GenesisWithdrawModal
              isOpen={true}
              onClose={handleClose}
              genesisAddress={genesisAddress}
              collateralSymbol={
                // collateral.symbol is now always the wrapped/deposited token (fxSAVE or wstETH)
                collateralSymbol
              }
              userDeposit={userDeposit || 0n}
              priceOracleAddress={priceOracleAddress}
              coinGeckoId={market?.coinGeckoId}
              peggedTokenSymbol={market?.peggedToken?.symbol}
              onSuccess={onSuccess}
              embedded={true}
            />
          ) : (
            <div className="text-center text-[#1E4775]/60 py-8">
              {activeTab === "withdraw" && !hasDeposit
                ? "No deposit to withdraw. Deposit first to participate in the Maiden Voyage."
                : isEnded && activeTab === "deposit"
                ? "Genesis has ended. Deposits are no longer accepted."
                : "Loading..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

