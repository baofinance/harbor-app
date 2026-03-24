"use client";

import React, { useState, useEffect } from "react";
import { GenesisDepositModal } from "./GenesisDepositModal";
import { GenesisWithdrawModal } from "./GenesisWithdrawModal";
import { DepositModalShell } from "./DepositModalShell";
import { ProtocolBanner } from "./ProtocolBanner";
import { DepositModalTabHeader } from "./DepositModalTabHeader";
import { useContractRead } from "wagmi";
import { useAccount } from "wagmi";
import { getAcceptedDepositAssets } from "@/utils/markets";

interface GenesisManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  market: any;
  initialTab?: "deposit" | "withdraw";
  onSuccess?: () => void;
}

import { GENESIS_ABI } from "@/abis/shared";

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
  // Use the market's chain so we read from the correct chain (e.g. MegaETH 4326), not the connected wallet chain
  const chainId = (market as any)?.chainId ?? 1;

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

  // Fetch user's deposit balance (with error handling) — chainId so we read from the market's chain
  const { data: userDeposit, error: depositError, isLoading: depositLoading } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled: !!address && isValidGenesisAddress && isOpen && mounted,
      retry: 1,
      retryDelay: 1000,
      allowFailure: true, // Don't throw on network errors
    },
  });

  // Check if genesis has ended (with error handling) — chainId so we read from the market's chain
  const { data: isEnded, error: endedError, isLoading: endedLoading } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "genesisIsEnded",
    chainId,
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

  const peggedSymbol =
    (market?.peggedToken?.symbol as string | undefined) || "haTOKEN";
  const leveragedSymbol = (market?.leveragedToken?.symbol as string | undefined) ?? "";

  return (
    <DepositModalShell
      isOpen={isOpen}
      onClose={handleClose}
      banner={
        <ProtocolBanner
          protocolName="Genesis"
          tokenSymbol={peggedSymbol}
          tokenIcon={(market?.peggedToken as { icon?: string } | undefined)?.icon}
          secondaryTokenSymbol={leveragedSymbol}
          secondaryTokenIcon={
            (market?.leveragedToken as { icon?: string } | undefined)?.icon
          }
        />
      }
      header={
        <DepositModalTabHeader
          tabs={[
            { value: "deposit", label: "Deposit" },
            { value: "withdraw", label: "Withdraw" },
          ]}
          activeTab={activeTab}
          onTabChange={(v) => handleTabChange(v as "deposit" | "withdraw")}
          tabDisabled={{
            deposit: !!isEnded,
            withdraw: !hasDeposit,
          }}
        />
      }
      headerClassName="p-0 pt-2 sm:pt-3 px-2 sm:px-3 border-b border-[#1E4775]/10"
      panelClassName="max-h-[95vh] sm:max-h-[90vh] flex flex-col animate-in fade-in-0 scale-in-95 duration-200"
      contentClassName="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 min-h-0"
    >
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
              chainId={chainId}
              market={market}
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
              chainId={chainId}
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
    </DepositModalShell>
  );
};

