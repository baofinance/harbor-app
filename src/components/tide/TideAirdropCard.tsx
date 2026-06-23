"use client";

import { Gift } from "lucide-react";
import { useTideAirdropEligibility } from "@/hooks/useTideAirdropEligibility";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideFeatureCard } from "./TideFeatureCard";
import {
  TIDE_AMOUNT_CLASS,
  TIDE_INSET_LABEL_CLASS,
  TIDE_META_TEXT,
  TIDE_THEME,
} from "./tideCardStyles";

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
      icon={<Gift className="h-4 w-4" strokeWidth={1.75} />}
      accentBarClass={theme.accentBar}
      iconBadgeClass={theme.iconBadge}
      title="Airdrop"
      subtitle="veBAO snapshot"
      subtitleClass={theme.subtitle}
      badge="Snapshot"
      badgeVariant={theme.badgeVariant}
      footer="Read from vebao_tide_airdrop.json"
      isConnected={isConnected}
      disconnectedMessage="Connect wallet to view your snapshot airdrop allocation"
    >
      {isLoading ? (
        <p className={TIDE_META_TEXT}>Loading snapshot…</p>
      ) : hasAllocation && allocation ? (
        <div className="flex w-full flex-col items-center gap-4 py-2 text-center">
          <div>
            <p className={`mb-1 ${TIDE_INSET_LABEL_CLASS} text-white/50`}>
              Snapshot allocation
            </p>
            <p className={TIDE_AMOUNT_CLASS}>
              {formatTideTokenAmount(allocation.amountTokens)}{" "}
              <span className="text-lg text-white/60 sm:text-xl">TIDE</span>
            </p>
          </div>
          {airdropDate ? (
            <div className={`w-full px-4 py-3 ${theme.highlight}`}>
              <p className={`text-sm font-medium ${theme.highlightText}`}>
                Will be airdropped on {formatAirdropDate(airdropDate)}
              </p>
            </div>
          ) : null}
          {snapshotBlock ? (
            <p className={TIDE_META_TEXT}>Snapshot block {snapshotBlock.toLocaleString()}</p>
          ) : null}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className={TIDE_META_TEXT}>
            No snapshot airdrop allocation for this wallet.
          </p>
        </div>
      )}
    </TideFeatureCard>
  );
}
