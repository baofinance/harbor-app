"use client";

import { ConnectWallet } from "@/components/Wallet";
import { DASHBOARD_GAP_MAJOR } from "@/components/dashboard/dashboardDensity";
import { DASHBOARD_PORTFOLIO_HERO_TITLE_CLASS } from "@/components/dashboard/dashboardStyles";
import {
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_META_TEXT,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import { TideTransactionProvider } from "@/contexts/TideTransactionContext";
import { useHarborAccount } from "@/hooks/useHarborAccount";
import { TideAirdropCard } from "./TideAirdropCard";
import { TideClaimCard } from "./TideClaimCard";
import { TideSwapCard } from "./TideSwapCard";

export function TideDashboard() {
  const { isConnected } = useHarborAccount();

  return (
    <TideTransactionProvider>
      <section className={`mt-8 ${DASHBOARD_GAP_MAJOR}`}>
        <div className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} px-4 py-3 sm:px-5 sm:py-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className={DASHBOARD_PORTFOLIO_HERO_TITLE_CLASS}>
                Your TIDE Dashboard
              </h2>
              <p className={`mt-1 ${MV_META_TEXT}`}>
                Snapshot-based airdrop &amp; claim data; swap reads Bao V2 wallet
                balance
              </p>
            </div>
            {!isConnected ? (
              <div className="shrink-0">
                <ConnectWallet />
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-stretch lg:gap-4">
          <TideAirdropCard />
          <TideClaimCard />
          <TideSwapCard />
        </div>
      </section>
    </TideTransactionProvider>
  );
}
