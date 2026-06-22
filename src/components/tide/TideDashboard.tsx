"use client";

import { ConnectWallet } from "@/components/Wallet";
import { useAccount } from "wagmi";
import { TideAirdropCard } from "./TideAirdropCard";
import { TideClaimCard } from "./TideClaimCard";
import { TideSwapCard } from "./TideSwapCard";

export function TideDashboard() {
  const { isConnected } = useAccount();

  return (
    <section className="mt-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Your TIDE Dashboard
          </h2>
          <p className="mt-1 text-sm text-white/45">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TideAirdropCard />
        <TideClaimCard />
        <TideSwapCard />
      </div>

      <p className="mt-4 text-center text-[11px] text-white/30">
        Claims read from vebao_tide_allocation.json; swap uses distributor
        convertBao
      </p>
    </section>
  );
}
