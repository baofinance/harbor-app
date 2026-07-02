"use client";

import type { ReactNode } from "react";
import { Gift } from "lucide-react";
import { TIDE_AIRDROP_BUCKETS, type TideAirdropBucketKey } from "@/config/tide";
import { useTideAirdropEligibility } from "@/hooks/useTideAirdropEligibility";
import { formatTideAirdropScheduleFooter } from "@/utils/tideDistributor";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideBoostersPendingHint } from "./TideBoostersPendingHint";
import { TideFeatureCard } from "./TideFeatureCard";
import {
  TIDE_AMOUNT_CLASS,
  TIDE_CARD_CONTENT_STACK,
  TIDE_FIELD_LABEL_CLASS,
  TIDE_FOOTER_EXTRA_CORAL_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_SM_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS,
  TIDE_INSET_LIGHT_LABEL_CLASS,
  TIDE_META_TEXT,
  TIDE_ROW_DIVIDER,
  TIDE_THEME,
} from "./tideCardStyles";

function AirdropBucketRow({
  label,
  amountTokens,
  amountAdornment,
}: {
  label: string;
  amountTokens: number;
  amountAdornment?: ReactNode;
}) {
  return (
    <div className={TIDE_ROW_DIVIDER}>
      <p className={TIDE_INSET_LIGHT_LABEL_CLASS}>{label}</p>
      <div className="flex items-center gap-1.5">
        <p className={`${TIDE_INSET_LIGHT_AMOUNT_SM_CLASS} text-base sm:text-lg`}>
          {formatTideTokenAmount(amountTokens)}{" "}
          <span className={TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS}>TIDE</span>
        </p>
        {amountAdornment}
      </div>
    </div>
  );
}

export function TideAirdropCard() {
  const { isLoading, buckets, totalTokens, boostersPending } =
    useTideAirdropEligibility();
  const theme = TIDE_THEME.coral;

  return (
    <TideFeatureCard
      icon={<Gift className="h-4 w-4" strokeWidth={1.75} />}
      iconBadgeClass={theme.iconBadge}
      title="Airdrop"
      subtitle="veBAO · Boosters · Raise · Marks"
      subtitleClass={theme.subtitle}
      badge="Snapshot"
      badgeVariant={theme.badgeVariant}
      footer="Eligibility from tide_airdrop.json"
      footerExtra={formatTideAirdropScheduleFooter()}
      footerExtraClassName={TIDE_FOOTER_EXTRA_CORAL_CLASS}
    >
      {isLoading ? (
        <p className={TIDE_META_TEXT}>Loading snapshot…</p>
      ) : (
        <div className={TIDE_CARD_CONTENT_STACK}>
          <div className="space-y-1.5 text-center">
            <p className={TIDE_FIELD_LABEL_CLASS}>Total allocation</p>
            <p className={TIDE_AMOUNT_CLASS}>
              {formatTideTokenAmount(totalTokens)}{" "}
              <span className="text-lg text-[#1E4775]/55 sm:text-xl">TIDE</span>
            </p>
          </div>

          <div className="w-full border-t border-[#1E4775]/10 pt-1">
            {TIDE_AIRDROP_BUCKETS.map(({ key, label }) => (
              <AirdropBucketRow
                key={key}
                label={label}
                amountTokens={buckets[key as TideAirdropBucketKey].amountTokens}
                amountAdornment={
                  key === "boosters" && boostersPending ? (
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
