"use client";

import type { ReactNode } from "react";
import { Gift } from "lucide-react";
import {
  TIDE_AIRDROP_BUCKETS,
  TIDE_BOOSTERS,
  type TideAirdropBucketKey,
} from "@/config/tide";
import { useTideAirdropEligibility } from "@/hooks/useTideAirdropEligibility";
import { formatTideAirdropMonthYear } from "@/utils/tideDistributor";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideBoostersPendingHint } from "./TideBoostersPendingHint";
import { TideFeatureCard } from "./TideFeatureCard";
import {
  TIDE_CARD_CONTENT_STACK,
  TIDE_DARK_AMOUNT_CLASS,
  TIDE_DARK_FIELD_LABEL_CLASS,
  TIDE_DARK_INSET_AMOUNT_SM_CLASS,
  TIDE_DARK_INSET_AMOUNT_UNIT_CLASS,
  TIDE_DARK_INSET_LABEL_CLASS,
  TIDE_DARK_META_TEXT,
  TIDE_DARK_ROW_DIVIDER,
  TIDE_FOOTER_EXTRA_CORAL_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_SM_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS,
  TIDE_INSET_LIGHT_LABEL_CLASS,
  TIDE_ROW_DIVIDER,
  TIDE_THEME,
} from "./tideCardStyles";

function AirdropBucketRow({
  label,
  amountTokens,
  amountAdornment,
  dark = false,
}: {
  label: string;
  amountTokens: number;
  amountAdornment?: ReactNode;
  dark?: boolean;
}) {
  const rowClass = dark ? TIDE_DARK_ROW_DIVIDER : TIDE_ROW_DIVIDER;
  const labelClass = dark ? TIDE_DARK_INSET_LABEL_CLASS : TIDE_INSET_LIGHT_LABEL_CLASS;
  const amountClass = dark
    ? TIDE_DARK_INSET_AMOUNT_SM_CLASS
    : `${TIDE_INSET_LIGHT_AMOUNT_SM_CLASS} text-base sm:text-lg`;
  const unitClass = dark
    ? TIDE_DARK_INSET_AMOUNT_UNIT_CLASS
    : TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS;

  return (
    <div className={rowClass}>
      <p className={labelClass}>{label}</p>
      <div className="flex items-center gap-1.5">
        <p className={amountClass}>
          {formatTideTokenAmount(amountTokens)}{" "}
          <span className={unitClass}>TIDE</span>
        </p>
        {amountAdornment}
      </div>
    </div>
  );
}

export function TideAirdropCard() {
  const { isLoading, buckets, totalTokens, airdropDate } =
    useTideAirdropEligibility();
  const theme = TIDE_THEME.coral;

  return (
    <TideFeatureCard
      variant="dark"
      icon={<Gift className="h-4 w-4" strokeWidth={1.75} />}
      iconBadgeClass={theme.darkIconBadge}
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
        <p className={TIDE_DARK_META_TEXT}>Loading snapshot…</p>
      ) : (
        <div className={TIDE_CARD_CONTENT_STACK}>
          <div className="space-y-1.5 text-center">
            <p className={TIDE_DARK_FIELD_LABEL_CLASS}>Total allocation</p>
            <p className={TIDE_DARK_AMOUNT_CLASS}>
              {formatTideTokenAmount(totalTokens)}{" "}
              <span className="text-lg text-white/50 sm:text-xl">TIDE</span>
            </p>
          </div>

          <div className="w-full border-t border-white/[0.08] pt-1">
            {TIDE_AIRDROP_BUCKETS.map(({ key, label }) => (
              <AirdropBucketRow
                key={key}
                dark
                label={label}
                amountTokens={buckets[key as TideAirdropBucketKey].amountTokens}
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
