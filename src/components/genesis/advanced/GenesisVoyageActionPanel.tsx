"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useContractRead } from "wagmi";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { GenesisDepositModal } from "@/components/GenesisDepositModal";
import { GenesisWithdrawModal } from "@/components/GenesisWithdrawModal";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { InfoCallout } from "@/components/InfoCallout";
import { useRegisterAppNotifications } from "@/contexts/AppNotificationsContext";
import { getAcceptedDepositAssets } from "@/utils/markets";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { isMarketArchived } from "@/config/markets";
import { GENESIS_ABI } from "@/abis/shared";
import {
  GENESIS_EMBEDDED_FORM_PANEL,
  GENESIS_EMBEDDED_PANEL_HEIGHT,
  GENESIS_TRADE_PANEL_ID,
  SAIL_ADVANCED_FROSTED_LIGHT_PANEL,
  SAIL_ADVANCED_LIGHT_BODY,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
} from "./genesisAdvancedStyles";

export type GenesisVoyageActionPanelProps = {
  marketId: string;
  market: GenesisMarketConfig;
  /** Controlled tab from layout (Deposit Now focuses deposit). */
  activeTab?: "deposit" | "withdraw";
  onTabChange?: (tab: "deposit" | "withdraw") => void;
  onSuccess?: () => void;
  depositsBlocked?: boolean;
};

/** Embedded Deposit | Withdraw panel — Sail Buy/Sell chrome, Genesis actions. */
export function GenesisVoyageActionPanel({
  marketId,
  market,
  activeTab: controlledTab,
  onTabChange,
  onSuccess,
  depositsBlocked: depositsBlockedProp,
}: GenesisVoyageActionPanelProps) {
  const { address } = useAccount();
  const [internalTab, setInternalTab] = useState<"deposit" | "withdraw">(
    "deposit",
  );
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const genesisAddress = market?.addresses?.genesis as `0x${string}` | undefined;
  const collateralAddress = market?.addresses?.wrappedCollateralToken as
    | `0x${string}`
    | undefined;
  const collateralSymbol = market?.collateral?.symbol || "TOKEN";
  const priceOracleAddress = market?.addresses?.collateralPrice as
    | string
    | undefined;
  const chainId = (market as { chainId?: number }).chainId ?? 1;
  const acceptedAssets = getAcceptedDepositAssets(market);
  const archived = isMarketArchived(market);

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

  const { data: isEnded } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "genesisIsEnded",
    chainId,
    query: {
      enabled: isValidGenesisAddress,
    },
  });

  const { data: userDeposit } = useContractRead({
    address: isValidGenesisAddress ? genesisAddress : undefined,
    abi: GENESIS_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: {
      enabled: !!address && isValidGenesisAddress,
    },
  });

  const hasDeposit = !!userDeposit && userDeposit > 0n;
  const depositsBlocked = depositsBlockedProp ?? (!!isEnded || archived);

  useEffect(() => {
    if (controlledTab == null) {
      setInternalTab(depositsBlocked && hasDeposit ? "withdraw" : "deposit");
    }
  }, [marketId, controlledTab, depositsBlocked, hasDeposit]);

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

  useRegisterAppNotifications(
    "genesis-embedded-trade",
    {
      count: genesisNotificationCount,
      badgeSeverities: [...genesisNotificationSeverities],
      body: genesisNotificationsBody,
    },
    true,
  );

  const panelTabs = (
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
  );

  return (
    <aside
      id={GENESIS_TRADE_PANEL_ID}
      className="flex scroll-mt-24 flex-col lg:h-full"
    >
      <div
        className={`${GENESIS_EMBEDDED_FORM_PANEL} ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} ${GENESIS_EMBEDDED_PANEL_HEIGHT} flex w-full min-w-0 flex-col overflow-hidden`}
      >
        {!isValidGenesisAddress || !isValidCollateralAddress ? (
          <div className="flex h-full flex-col overflow-hidden pt-2.5 sm:pt-3">
            <div className="shrink-0">{panelTabs}</div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <p className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>
                Invalid market configuration
              </p>
              <p className={SAIL_ADVANCED_LIGHT_BODY}>
                Genesis or collateral address is missing for this voyage.
              </p>
            </div>
          </div>
        ) : activeTab === "withdraw" && hasDeposit && genesisAddress ? (
          <GenesisWithdrawModal
            isOpen
            onClose={() => {}}
            genesisAddress={genesisAddress}
            collateralSymbol={collateralSymbol}
            userDeposit={userDeposit || 0n}
            priceOracleAddress={priceOracleAddress}
            coinGeckoId={market?.coinGeckoId}
            chainId={chainId}
            onSuccess={onSuccess}
            embedded
            panelHeader={panelTabs}
          />
        ) : activeTab === "deposit" && !depositsBlocked ? (
          <GenesisDepositModal
            isOpen
            onClose={() => {}}
            genesisAddress={genesisAddress!}
            collateralAddress={collateralAddress!}
            collateralSymbol={collateralSymbol}
            wrappedCollateralSymbol={collateralSymbol}
            underlyingSymbol={market?.collateral?.underlyingSymbol}
            acceptedAssets={acceptedAssets}
            marketAddresses={{
              collateralToken: (
                market?.addresses as { collateralToken?: string } | undefined
              )?.collateralToken,
              wrappedCollateralToken:
                market?.addresses?.wrappedCollateralToken,
              priceOracle: market?.addresses?.collateralPrice,
              genesisZap: (
                market?.addresses as { genesisZap?: string } | undefined
              )?.genesisZap,
              peggedTokenZap: (
                market?.addresses as { peggedTokenZap?: string } | undefined
              )?.peggedTokenZap,
              leveragedTokenZap: (
                market?.addresses as
                  | { leveragedTokenZap?: string }
                  | undefined
              )?.leveragedTokenZap,
            }}
            coinGeckoId={market?.coinGeckoId}
            chainId={chainId}
            market={market}
            onSuccess={onSuccess}
            embedded
            panelHeader={panelTabs}
          />
        ) : activeTab === "withdraw" && !hasDeposit ? (
          <div className="flex h-full flex-col overflow-hidden pt-2.5 sm:pt-3">
            <div className="shrink-0">{panelTabs}</div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <p className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>No deposit yet</p>
              <p className={SAIL_ADVANCED_LIGHT_BODY}>
                Deposit first to join this Maiden Voyage, then you can withdraw
                from here.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden pt-2.5 sm:pt-3">
            <div className="shrink-0">{panelTabs}</div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <p className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>
                Deposits closed
              </p>
              <p className={SAIL_ADVANCED_LIGHT_BODY}>
                This voyage is no longer accepting deposits.
                {hasDeposit
                  ? " Switch to Withdraw to manage your position."
                  : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
