"use client";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { formatUSD } from "@/utils/formatters";
import {
  JourneyRevenueSplitDiagram,
  type JourneyRevenueSplitBranch,
} from "./JourneyRevenueSplitDiagram";
import {
  JOURNEY_REVENUE_BANNER_CLASS,
  JOURNEY_REVENUE_BANNER_PRIMARY_CLASS,
  JOURNEY_REVENUE_BANNER_SPLIT_PANEL_CLASS,
  JOURNEY_REVENUE_BANNER_VALUE_CLASS,
  JOURNEY_REVENUE_LABEL_CLASS,
  JOURNEY_REVENUE_TAGLINE_CLASS,
} from "./revenueJourneyStyles";

export type JourneyRevenueBannerProps = {
  label: string;
  tagline: string;
  revenueUsd: number | null;
  isLoading?: boolean;
  splitSourceLabel: string;
  splitSourceTitle: string;
  splitBranches: [JourneyRevenueSplitBranch, JourneyRevenueSplitBranch];
};

export function JourneyRevenueBanner({
  label,
  tagline,
  revenueUsd,
  isLoading = false,
  splitSourceLabel,
  splitSourceTitle,
  splitBranches,
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

      <div className={JOURNEY_REVENUE_BANNER_SPLIT_PANEL_CLASS}>
        <JourneyRevenueSplitDiagram
          sourceLabel={splitSourceLabel}
          sourceTitle={splitSourceTitle}
          branches={splitBranches}
        />
      </div>
    </div>
  );
}
