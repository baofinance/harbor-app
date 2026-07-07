"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { formatUSD } from "@/utils/formatters";
import {
  JOURNEY_REVENUE_BANNER_BUYBACK_CLASS,
  JOURNEY_REVENUE_BANNER_BUYBACK_DESC_CLASS,
  JOURNEY_REVENUE_BANNER_BUYBACK_TITLE_CLASS,
  JOURNEY_REVENUE_BANNER_CLASS,
  JOURNEY_REVENUE_BANNER_DIVIDER_CLASS,
  JOURNEY_REVENUE_BANNER_PRIMARY_CLASS,
  JOURNEY_REVENUE_BANNER_VALUE_CLASS,
  JOURNEY_REVENUE_LABEL_CLASS,
  JOURNEY_REVENUE_TAGLINE_CLASS,
  JOURNEY_STAGE_ICON_BADGE,
  JOURNEY_STAGE_STAT_LABEL_CLASS,
  JOURNEY_STAGE_STAT_SUB_CLASS,
  JOURNEY_STAGE_STAT_VALUE_CLASS,
} from "./revenueJourneyStyles";

export type JourneyRevenueBannerProps = {
  label: string;
  tagline: string;
  revenueUsd: number | null;
  isLoading?: boolean;
  buybackTitle: string;
  buybackDescription: string;
  buybackStatLabel: string;
  buybackTideAmount: string;
  buybackUsdAmount: string;
};

export function JourneyRevenueBanner({
  label,
  tagline,
  revenueUsd,
  isLoading = false,
  buybackTitle,
  buybackDescription,
  buybackStatLabel,
  buybackTideAmount,
  buybackUsdAmount,
}: JourneyRevenueBannerProps) {
  const target = revenueUsd ?? 0;
  const animated = useAnimatedNumber(target, { disabled: isLoading });

  const display = isLoading
    ? "…"
    : formatUSD(animated, { compact: false });

  return (
    <div className={JOURNEY_REVENUE_BANNER_CLASS}>
      <div className={JOURNEY_REVENUE_BANNER_PRIMARY_CLASS}>
        <p className={JOURNEY_REVENUE_LABEL_CLASS}>{label}</p>
        <p className={JOURNEY_REVENUE_BANNER_VALUE_CLASS}>{display}</p>
        <p className={JOURNEY_REVENUE_TAGLINE_CLASS}>{tagline}</p>
      </div>

      <div className={JOURNEY_REVENUE_BANNER_DIVIDER_CLASS} aria-hidden />

      <div className={JOURNEY_REVENUE_BANNER_BUYBACK_CLASS}>
        <div className="flex items-start gap-3">
          <span className={JOURNEY_STAGE_ICON_BADGE} aria-hidden>
            <ArrowPathIcon className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={JOURNEY_REVENUE_BANNER_BUYBACK_TITLE_CLASS}>
              {buybackTitle}
            </p>
            <p className={JOURNEY_REVENUE_BANNER_BUYBACK_DESC_CLASS}>
              {buybackDescription}
            </p>
            <div className="mt-3">
              <p className={JOURNEY_STAGE_STAT_LABEL_CLASS}>{buybackStatLabel}</p>
              <p className={JOURNEY_STAGE_STAT_VALUE_CLASS}>{buybackTideAmount}</p>
              <p className={JOURNEY_STAGE_STAT_SUB_CLASS}>{buybackUsdAmount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
