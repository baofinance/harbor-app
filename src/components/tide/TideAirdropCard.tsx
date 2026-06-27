"use client";

import { Gift } from "lucide-react";
import {
  TIDE_AIRDROP_BUCKETS,
  TIDE_BOOSTERS,
  type TideAirdropBucketKey,
} from "@/config/tide";
import { useTideAirdropEligibility } from "@/hooks/useTideAirdropEligibility";
import { formatTideAirdropMonthYear } from "@/utils/tideDistributor";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideAmountPanel } from "./TideAmountPanel";
import { TideBoostersPendingHint } from "./TideBoostersPendingHint";
import { TideFeatureCard } from "./TideFeatureCard";
import {
  TIDE_AMOUNT_CLASS,
  TIDE_CARD_CONTENT_STACK,
  TIDE_FOOTER_EXTRA_CORAL_CLASS,
  TIDE_INSET_LABEL_CLASS,
  TIDE_META_TEXT,
  TIDE_THEME,
} from "./tideCardStyles";

export function TideAirdropCard() {
  const { isLoading, buckets, totalTokens, airdropDate } =
    useTideAirdropEligibility();
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
    >
      {isLoading ? (
        <p className={TIDE_META_TEXT}>Loading snapshot…</p>
      ) : (
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
              <TideAmountPanel
                key={key}
                label={label}
                amountTokens={buckets[key as TideAirdropBucketKey].amountTokens}
                insetClassName={theme.inset}
                amountAdornment={
                  key === "boosters" && TIDE_BOOSTERS.pending ? (
                    <TideBoostersPendingHint />
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>
      )}
    </TideFeatureCard>
  );
}
