"use client";

import { Gift } from "lucide-react";
import {
  TIDE_AIRDROP_BUCKETS,
  type TideAirdropBucketAmount,
  type TideAirdropBucketKey,
} from "@/config/tide";
import { useTideAirdropEligibility } from "@/hooks/useTideAirdropEligibility";
import { formatTideAirdropMonthYear } from "@/utils/tideDistributor";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideFeatureCard } from "./TideFeatureCard";
import {
  TIDE_AMOUNT_CLASS,
  TIDE_AMOUNT_SM_CLASS,
  TIDE_CARD_CONTENT_STACK,
  TIDE_FOOTER_EXTRA_CORAL_CLASS,
  TIDE_INSET_LABEL_CLASS,
  TIDE_META_TEXT,
  TIDE_THEME,
} from "./tideCardStyles";

function AirdropBucketRow({
  label,
  amount,
  themeInset,
}: {
  label: string;
  amount: TideAirdropBucketAmount;
  themeInset: string;
}) {
  return (
    <div className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 ${themeInset}`}>
      <p className={`${TIDE_INSET_LABEL_CLASS} text-white/55`}>{label}</p>
      <p className={`${TIDE_AMOUNT_SM_CLASS} text-base sm:text-lg`}>
        {formatTideTokenAmount(amount.amountTokens)}{" "}
        <span className="text-sm text-white/50">TIDE</span>
      </p>
    </div>
  );
}

export function TideAirdropCard() {
  const {
    isConnected,
    isLoading,
    buckets,
    totalTokens,
    airdropDate,
  } = useTideAirdropEligibility();
  const theme = TIDE_THEME.coral;

  return (
    <TideFeatureCard
      icon={<Gift className="h-4 w-4" strokeWidth={1.75} />}
      accentBarClass={theme.accentBar}
      iconBadgeClass={theme.iconBadge}
      title="Airdrop"
      subtitle="veBAO · Boosters · Raise · Marks"
      subtitleClass={theme.subtitle}
      badge="Snapshot"
      badgeVariant={theme.badgeVariant}
      footer="Eligibility from tide_airdrop.json"
      footerExtra={
        airdropDate
          ? `Will be airdropped ${formatTideAirdropMonthYear(airdropDate)}`
          : undefined
      }
      footerExtraClassName={TIDE_FOOTER_EXTRA_CORAL_CLASS}
      isConnected={isConnected}
      disconnectedMessage="Connect wallet to view your snapshot airdrop allocation"
    >
      {isLoading ? (
        <p className={TIDE_META_TEXT}>Loading snapshot…</p>
      ) : buckets ? (
        <div className={TIDE_CARD_CONTENT_STACK}>
          <div className="text-center">
            <p className={`mb-1.5 ${TIDE_INSET_LABEL_CLASS} text-white/50`}>
              Total allocation
            </p>
            <p className={TIDE_AMOUNT_CLASS}>
              {formatTideTokenAmount(totalTokens)}{" "}
              <span className="text-lg text-white/60 sm:text-xl">TIDE</span>
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:gap-3.5">
            {TIDE_AIRDROP_BUCKETS.map(({ key, label }) => (
              <AirdropBucketRow
                key={key}
                label={label}
                amount={buckets[key as TideAirdropBucketKey]}
                themeInset={theme.inset}
              />
            ))}
          </div>
        </div>
      ) : null}
    </TideFeatureCard>
  );
}
