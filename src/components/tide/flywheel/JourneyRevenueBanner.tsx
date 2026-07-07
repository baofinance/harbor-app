"use client";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { formatUSD } from "@/utils/formatters";
import type { ReactNode } from "react";
import {
  JourneyRevenueSplitDiagram,
  type JourneyRevenueSplitBranch,
} from "./JourneyRevenueSplitDiagram";

export type JourneyRevenueBannerProps = {
  label: string;
  tagline?: string;
  revenueUsd: number | null;
  isLoading?: boolean;
  reinvest: JourneyRevenueSplitBranch;
  strengthenTide: JourneyRevenueSplitBranch;
  stageCards?: ReactNode;
};

export function JourneyRevenueBanner({
  label,
  tagline,
  revenueUsd,
  isLoading = false,
  reinvest,
  strengthenTide,
  stageCards,
}: JourneyRevenueBannerProps) {
  const target = revenueUsd ?? 0;
  const animated = useAnimatedNumber(target, { disabled: isLoading });

  const display = isLoading ? "…" : formatUSD(animated, { compact: false });

  return (
    <JourneyRevenueSplitDiagram
      sourceLabel={label}
      sourceValue={display}
      sourceTagline={tagline}
      reinvest={reinvest}
      strengthenTide={strengthenTide}
      stageCards={stageCards}
    />
  );
}
