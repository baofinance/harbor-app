"use client";

import React, { useMemo, useState, useEffect } from "react";
import { GenesisDepositModal } from "./GenesisDepositModal";
import { GenesisWithdrawModal } from "./GenesisWithdrawModal";
import { DepositModalShell } from "./DepositModalShell";
import { DepositModalTabHeader } from "./DepositModalTabHeader";
import { DepositModalTitle } from "./DepositModalTitle";
import { InfoCallout } from "@/components/InfoCallout";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { useContractRead } from "wagmi";
import { useAccount } from "wagmi";
import { getAcceptedDepositAssets } from "@/utils/markets";
import { isMarketArchived } from "@/config/markets";
import { GENESIS_ABI } from "@/abis/shared";

interface GenesisManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  market: any;
  initialTab?: "deposit" | "withdraw";
  onSuccess?: () => void;
}

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
  const [showNotifications, setShowNotifications] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setMounted(true), 100);
      return () => clearTimeout(timer);
    }
    setMounted(false);
  }, [isOpen]);

  const genesisAddress = market?.addresses?.genesis as `0x${string}` | undefined;
  const collateralAddress = market?.addresses?.wrappedCollateralToken as
    | `0x${string}`
    | undefined;
  const collateralSymbol = market?.collateral?.symbol || "TOKEN";
  const priceOracleAddress = market?.addresses?.collateralPrice as
    | string
    | undefined;
  const chainId = (market as { chainId?: number })?.chainId ?? 1;

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

  const {
    data: userDeposit,
    error: depositError,
    isLoading: depositLoading,
  } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled: !!address && isValidGenesisAddress && isOpen && mounted,
      retry: 1,
      retryDelay: 1000,
      allowFailure: true,
    },
  });

  const {
    data: isEnded,
    error: endedError,
    isLoading: endedLoading,
  } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "genesisIsEnded",
    chainId,
    query: {
      enabled: isValidGenesisAddress && isOpen && mounted,
      retry: 1,
      retryDelay: 1000,
      allowFailure: true,
    },
  });

  const acceptedAssets = getAcceptedDepositAssets(market);
  const hasDeposit = userDeposit && userDeposit > 0n;
  const archived = isMarketArchived(market);
  const depositsBlocked = !!isEnded || archived;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const genesisNotificationCount = activeTab === "deposit" ? 2 : 1;
  const genesisNotificationSeverities = useMemo(
    () =>
      activeTab === "deposit"
        ? (["green", "navy"] as const)
        : (["coral"] as const),
    [activeTab],
  );
  const genesisNotificationsBody = useMemo(
    () =>
      activeTab === "deposit" ? (
        <>
          <InfoCallout
            tone="success"
            title="Tip:"
            icon={
              <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            }
          >
            You can deposit any ERC20 token! Non-collateral tokens will be
            automatically swapped via Velora.
          </InfoCallout>
          <InfoCallout
            title="Info:"
            icon={
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            }
          >
            For large deposits, Harbor recommends using wstETH or fxSAVE instead
            of the built-in swap and zaps.
          </InfoCallout>
        </>
      ) : (
        <InfoCallout
          tone="pearl"
          icon={
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D57A3D]" />
          }
          title="Harbor Marks Warning:"
        >
          Withdrawing forfeits any Harbor Marks for withdrawn assets. Only
          assets still deposited at genesis close are eligible for completion
          bonus marks earned during the genesis period.
        </InfoCallout>
      ),
    [activeTab],
  );

  // Overlay modal keeps notifications in the shell (not the nav bell).
  if (!isOpen) return null;

  const peggedSymbol =
    (market?.peggedToken?.symbol as string | undefined) || "haTOKEN";
  const leveragedSymbol =
    (market?.leveragedToken?.symbol as string | undefined) ?? "";

  return (
    <DepositModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={
        <DepositModalTitle
          protocolName="Genesis"
          tokenSymbol={peggedSymbol}
          tokenIcon={
            (market?.peggedToken as { icon?: string } | undefined)?.icon
          }
          secondaryTokenSymbol={leveragedSymbol || undefined}
          secondaryTokenIcon={
            (market?.leveragedToken as { icon?: string } | undefined)?.icon
          }
          actionLabel={activeTab === "deposit" ? "Deposit" : "Withdraw"}
        />
      }
      tabs={
        <DepositModalTabHeader
          tabs={[
            { value: "deposit", label: "Deposit" },
            { value: "withdraw", label: "Withdraw" },
          ]}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as "deposit" | "withdraw")}
          tabDisabled={{
            deposit: depositsBlocked,
            withdraw: !hasDeposit,
          }}
        />
      }
      notifications={{
        expanded: showNotifications,
        onToggle: () => setShowNotifications((p) => !p),
        count: genesisNotificationCount,
        badgeSeverities: [...genesisNotificationSeverities],
        children: genesisNotificationsBody,
      }}
    >
      {!isValidGenesisAddress || !isValidCollateralAddress ? (
        <div className="py-8 text-center text-[#1E4775]/60">
          <p className="mb-2 font-semibold">Invalid Market Configuration</p>
          <p className="text-xs">
            Genesis: {genesisAddress || "Not set"}
            <br />
            Collateral: {collateralAddress || "Not set"}
          </p>
        </div>
      ) : depositError || endedError ? (
        <div className="py-8 text-center">
          <p className="mb-2 font-semibold text-red-600">
            Error Loading Market Data
          </p>
          <p className="mb-4 text-sm text-[#1E4775]/60">
            {depositError?.message ||
              endedError?.message ||
              "Network error. Please check your connection and try again."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-md bg-[#1E4775] px-4 py-2 text-white transition-colors hover:bg-[#17395F]"
          >
            Close
          </button>
        </div>
      ) : depositLoading || endedLoading ? (
        <div className="py-8 text-center text-[#1E4775]/60">
          <div className="animate-pulse">Loading market data...</div>
        </div>
      ) : activeTab === "deposit" &&
        !depositsBlocked &&
        isValidGenesisAddress &&
        isValidCollateralAddress ? (
        <GenesisDepositModal
          isOpen={true}
          onClose={onClose}
          genesisAddress={genesisAddress}
          collateralAddress={collateralAddress}
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
          chainId={chainId}
          market={market}
          onSuccess={onSuccess}
          embedded={true}
        />
      ) : activeTab === "withdraw" && genesisAddress && hasDeposit ? (
        <GenesisWithdrawModal
          isOpen={true}
          onClose={onClose}
          genesisAddress={genesisAddress}
          collateralSymbol={collateralSymbol}
          userDeposit={userDeposit || 0n}
          priceOracleAddress={priceOracleAddress}
          coinGeckoId={market?.coinGeckoId}
          chainId={chainId}
          onSuccess={onSuccess}
          embedded={true}
        />
      ) : (
        <div className="py-8 text-center text-[#1E4775]/60">
          {activeTab === "withdraw" && !hasDeposit
            ? "No deposit to withdraw. Deposit first to join Maiden voyage 2.0."
            : isEnded && activeTab === "deposit"
              ? "Genesis has ended. Deposits are no longer accepted."
              : "Loading..."}
        </div>
      )}
    </DepositModalShell>
  );
};
