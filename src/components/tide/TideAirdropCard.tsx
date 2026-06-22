"use client";

import { Gift } from "lucide-react";
import { useTideAirdropEligibility } from "@/hooks/useTideAirdropEligibility";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideFeatureCard } from "./TideFeatureCard";
import { TIDE_AMOUNT_CLASS, TIDE_THEME } from "./tideCardStyles";

function formatAirdropDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function TideAirdropCard() {
  const { isConnected, isLoading, allocation, hasAllocation, airdropDate, snapshotBlock } =
    useTideAirdropEligibility();
  const theme = TIDE_THEME.coral;

  return (
    <TideFeatureCard
      icon={
        <Gift className={`h-5 w-5 ${theme.iconText}`} strokeWidth={1.75} />
      }
      iconBgClass={theme.iconBg}
      title="Airdrop"
      subtitle="veBAO snapshot"
      subtitleClass={theme.subtitle}
      badge="Snapshot"
      badgeClass={theme.badge}
      footer="Read from vebao_tide_airdrop.json"
      isConnected={isConnected}
      disconnectedMessage="Connect wallet to view your snapshot airdrop allocation"
    >
      {isLoading ? (
        <p className="text-sm text-white/50">Loading snapshot…</p>
      ) : hasAllocation && allocation ? (
        <div className="flex w-full flex-col items-center gap-4 text-center">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-white/45">
              Snapshot allocation
            </p>
            <p className={TIDE_AMOUNT_CLASS}>
              {formatTideTokenAmount(allocation.amountTokens)}{" "}
              <span className="text-xl text-white/70">TIDE</span>
            </p>
          </div>
          {airdropDate ? (
            <div
              className={`w-full rounded-lg border px-4 py-3 ${theme.highlight}`}
            >
              <p className={`text-sm font-medium ${theme.highlightText}`}>
                Will be airdropped on {formatAirdropDate(airdropDate)}
              </p>
            </div>
          ) : null}
          {snapshotBlock ? (
            <p className="text-xs text-white/35">
              Snapshot block {snapshotBlock.toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-white/50">
            No snapshot airdrop allocation for this wallet.
          </p>
        </div>
      )}
    </TideFeatureCard>
  );
}
