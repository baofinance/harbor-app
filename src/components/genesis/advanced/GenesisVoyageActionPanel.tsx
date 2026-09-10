"use client";

import { useEffect, useState } from "react";
import { GenesisDepositModal } from "@/components/GenesisDepositModal";
import { DepositModalTabHeader } from "@/components/DepositModalTabHeader";
import { getAcceptedDepositAssets } from "@/utils/markets";
import type { GenesisMarketConfig } from "@/types/genesisMarket";
import { isMarketArchived } from "@/config/markets";
import { useContractRead } from "wagmi";
import { GENESIS_ABI } from "@/abis/shared";
import { GenesisHowItWorksContent } from "./GenesisHowItWorksContent";
import {
  GENESIS_TRADE_PANEL_ID,
  SAIL_ADVANCED_LIGHT_BODY,
  SAIL_ADVANCED_LIGHT_SECTION_TITLE,
  SAIL_EMBEDDED_FORM_PANEL,
  SAIL_EMBEDDED_PANEL_HEIGHT,
} from "./genesisAdvancedStyles";

export type GenesisVoyageActionPanelProps = {
  marketId: string;
  market: GenesisMarketConfig;
  /** Controlled tab from layout (Deposit Now focuses deposit). */
  activeTab?: "deposit" | "how";
  onTabChange?: (tab: "deposit" | "how") => void;
  onSuccess?: () => void;
  depositsBlocked?: boolean;
};

/** Embedded Deposit | How it works panel — Earn/Sail frosted chrome. */
export function GenesisVoyageActionPanel({
  marketId,
  market,
  activeTab: controlledTab,
  onTabChange,
  onSuccess,
  depositsBlocked: depositsBlockedProp,
}: GenesisVoyageActionPanelProps) {
  const [internalTab, setInternalTab] = useState<"deposit" | "how">("deposit");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const genesisAddress = market?.addresses?.genesis as `0x${string}` | undefined;
  const collateralAddress = market?.addresses?.wrappedCollateralToken as
    | `0x${string}`
    | undefined;
  const collateralSymbol = market?.collateral?.symbol || "TOKEN";
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

  const depositsBlocked =
    depositsBlockedProp ?? (!!isEnded || archived);

  useEffect(() => {
    // Reset to deposit when voyage changes unless parent controls tab.
    if (controlledTab == null) {
      setInternalTab("deposit");
    }
  }, [marketId, controlledTab]);

  return (
    <aside id={GENESIS_TRADE_PANEL_ID} className="flex scroll-mt-24 flex-col lg:h-full">
      <div
        className={`${SAIL_EMBEDDED_FORM_PANEL} ${SAIL_EMBEDDED_PANEL_HEIGHT} flex w-full min-w-0 flex-col overflow-hidden`}
      >
        <div className="shrink-0 border-b border-[#1E4775]/12 px-2 pt-1.5 sm:px-3">
          <DepositModalTabHeader
            tabs={[
              { value: "deposit", label: "Deposit" },
              { value: "how", label: "How it works" },
            ]}
            activeTab={activeTab}
            onTabChange={(v) => setActiveTab(v as "deposit" | "how")}
            tabDisabled={{
              deposit: depositsBlocked,
            }}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeTab === "how" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              <p className={`mb-3 ${SAIL_ADVANCED_LIGHT_SECTION_TITLE}`}>
                Voyage steps
              </p>
              <GenesisHowItWorksContent />
            </div>
          ) : !isValidGenesisAddress || !isValidCollateralAddress ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <p className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>
                Invalid market configuration
              </p>
              <p className={SAIL_ADVANCED_LIGHT_BODY}>
                Genesis or collateral address is missing for this voyage.
              </p>
            </div>
          ) : depositsBlocked ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <p className={SAIL_ADVANCED_LIGHT_SECTION_TITLE}>
                Deposits closed
              </p>
              <p className={SAIL_ADVANCED_LIGHT_BODY}>
                This voyage is no longer accepting deposits. Use Manage on All
                Voyages to withdraw if you have a position.
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
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
                  collateralToken: (market?.addresses as { collateralToken?: string } | undefined)
                    ?.collateralToken,
                  wrappedCollateralToken:
                    market?.addresses?.wrappedCollateralToken,
                  priceOracle: market?.addresses?.collateralPrice,
                  genesisZap: (market?.addresses as { genesisZap?: string } | undefined)
                    ?.genesisZap,
                  peggedTokenZap: (
                    market?.addresses as { peggedTokenZap?: string } | undefined
                  )?.peggedTokenZap,
                  leveragedTokenZap: (
                    market?.addresses as { leveragedTokenZap?: string } | undefined
                  )?.leveragedTokenZap,
                }}
                coinGeckoId={market?.coinGeckoId}
                chainId={chainId}
                market={market}
                onSuccess={onSuccess}
                embedded
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
