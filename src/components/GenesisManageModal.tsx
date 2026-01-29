"use client";

import React, { useState, useEffect } from "react";
import { GenesisDepositModal } from "./GenesisDepositModal";
import { GenesisWithdrawModal } from "./GenesisWithdrawModal";
import { useContractRead } from "wagmi";
import { useAccount } from "wagmi";
import { getAcceptedDepositAssets } from "@/utils/markets";
import { getLogoPath } from "@/lib/logos";
import {
  BaseManageModal,
  type BaseManageModalConfig,
  type BaseManageModalTabConfig,
  type TabContentContext,
} from "@/components/modal";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(timer);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  const genesisAddress = market?.addresses?.genesis as `0x${string}` | undefined;
  const collateralAddress = market?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
  const collateralSymbol = market?.collateral?.symbol || "TOKEN";
  const priceOracleAddress = market?.addresses?.collateralPrice as string | undefined;

  const isValidGenesisAddress =
    !!genesisAddress &&
    typeof genesisAddress === "string" &&
    genesisAddress.startsWith("0x") &&
    genesisAddress.length === 42;

  const isValidCollateralAddress =
    !!collateralAddress &&
    typeof collateralAddress === "string" &&
    collateralAddress.startsWith("0x") &&
    collateralAddress.length === 42;

  const { data: userDeposit, error: depositError, isLoading: depositLoading } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isValidGenesisAddress && isOpen && mounted,
      retry: 1,
      retryDelay: 1000,
      allowFailure: true,
    },
  });

  const { data: isEnded, error: endedError, isLoading: endedLoading } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "genesisIsEnded",
    query: {
      enabled: isValidGenesisAddress && isOpen && mounted,
      retry: 1,
      retryDelay: 1000,
      allowFailure: true,
    },
  });

  const acceptedAssets = getAcceptedDepositAssets(market);
  const hasDeposit = !!(userDeposit && userDeposit > 0n);
  const ended = !!isEnded;

  const handleClose = () => onClose();

  const renderStatusView = (type: "invalid" | "error" | "loading" | "noDeposit" | "ended") => {
    if (type === "invalid") {
      return (
        <div className="text-center text-[#1E4775]/60 py-8">
          <p className="font-semibold mb-2">Invalid Market Configuration</p>
          <p className="text-xs">
            Genesis: {genesisAddress || "Not set"}
            <br />
            Collateral: {collateralAddress || "Not set"}
          </p>
        </div>
      );
    }
    if (type === "error") {
      return (
        <div className="text-center py-8">
          <p className="font-semibold mb-2 text-red-600">Error Loading Market Data</p>
          <p className="text-sm text-[#1E4775]/60 mb-4">
            {depositError?.message ||
              endedError?.message ||
              "Network error. Please check your connection and try again."}
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-[#1E4775] text-white rounded-full hover:bg-[#17395F] transition-colors touch-target"
          >
            Close
          </button>
        </div>
      );
    }
    if (type === "loading") {
      return (
        <div className="text-center text-[#1E4775]/60 py-8">
          <div className="animate-pulse">Loading market data...</div>
        </div>
      );
    }
    if (type === "noDeposit") {
      return (
        <div className="text-center text-[#1E4775]/60 py-8">
          No deposit to withdraw. Deposit first to participate in the Maiden Voyage.
        </div>
      );
    }
    if (type === "ended") {
      return (
        <div className="text-center text-[#1E4775]/60 py-8">
          Genesis has ended. Deposits are no longer accepted.
        </div>
      );
    }
    return null;
  };

  const renderDepositContent = (ctx: TabContentContext) => {
    if (!isValidGenesisAddress || !isValidCollateralAddress) return renderStatusView("invalid");
    if (depositError || endedError) return renderStatusView("error");
    if (depositLoading || endedLoading) return renderStatusView("loading");
    if (ended) return renderStatusView("ended");
    return (
      <GenesisDepositModal
        isOpen={true}
        onClose={ctx.onClose}
        genesisAddress={genesisAddress!}
        collateralAddress={collateralAddress!}
        collateralSymbol={collateralSymbol}
        wrappedCollateralSymbol={collateralSymbol}
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
        hideSectionHeading={true}
      />
    );
  };

  const renderWithdrawContent = (ctx: TabContentContext) => {
    if (!isValidGenesisAddress || !isValidCollateralAddress) return renderStatusView("invalid");
    if (depositError || endedError) return renderStatusView("error");
    if (depositLoading || endedLoading) return renderStatusView("loading");
    if (!hasDeposit || !genesisAddress) return renderStatusView("noDeposit");
    return (
      <GenesisWithdrawModal
        isOpen={true}
        onClose={ctx.onClose}
        genesisAddress={genesisAddress}
        collateralSymbol={collateralSymbol}
        userDeposit={userDeposit || 0n}
        priceOracleAddress={priceOracleAddress}
        coinGeckoId={market?.coinGeckoId}
        peggedTokenSymbol={market?.peggedToken?.symbol}
        onSuccess={onSuccess}
        embedded={true}
        hideSectionHeading={true}
      />
    );
  };

  const primaryToken = market?.peggedToken
    ? {
        symbol: market.peggedToken.symbol,
        icon: (market.peggedToken as { icon?: string })?.icon ?? getLogoPath(market.peggedToken.symbol ?? ""),
      }
    : { symbol: "?", icon: getLogoPath("") };
  const secondaryToken = market?.leveragedToken?.symbol
    ? {
        symbol: market.leveragedToken.symbol,
        icon: (market.leveragedToken as { icon?: string })?.icon ?? getLogoPath(market.leveragedToken.symbol),
      }
    : undefined;

  const config: BaseManageModalConfig = {
    protocol: "Genesis",
    header: { primaryToken, secondaryToken },
    tabs: [
      {
        id: "deposit",
        label: "Deposit",
        disabled: ended,
        sectionHeading: "Deposit Collateral & Amount",
        renderContent: renderDepositContent,
      },
      {
        id: "withdraw",
        label: "Withdraw",
        disabled: !hasDeposit,
        sectionHeading: "Withdraw Collateral & Amount",
        renderContent: renderWithdrawContent,
      },
    ],
    initialTab,
    sectionHeadingWithBorder: true,
  };

  return (
    <BaseManageModal
      isOpen={isOpen}
      onClose={handleClose}
      config={config}
    />
  );
};
