"use client";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { formatUSD } from "@/utils/formatters";
import {
  JOURNEY_REVENUE_HERO_CLASS,
  JOURNEY_REVENUE_LABEL_CLASS,
  JOURNEY_REVENUE_TAGLINE_CLASS,
  JOURNEY_REVENUE_VALUE_CLASS,
} from "./revenueJourneyStyles";

export type JourneyRevenueHeroProps = {
  label: string;
  tagline: string;
  revenueUsd: number | null;
  isLoading?: boolean;
};

export function JourneyRevenueHero({
  label,
  tagline,
  revenueUsd,
  isLoading = false,
}: JourneyRevenueHeroProps) {
  const target = revenueUsd ?? 0;
  const animated = useAnimatedNumber(target, { disabled: isLoading });

  const display = isLoading
    ? "…"
    : formatUSD(animated, { compact: false });

  return (
    <div className={JOURNEY_REVENUE_HERO_CLASS}>
      <p className={JOURNEY_REVENUE_LABEL_CLASS}>{label}</p>
      <p className={JOURNEY_REVENUE_VALUE_CLASS}>{display}</p>
      <p className={JOURNEY_REVENUE_TAGLINE_CLASS}>{tagline}</p>
    </div>
  );
}
