"use client";

import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";
import { GenesisMaidenVoyageWhyJoinCard } from "./GenesisMaidenVoyageWhyJoinCard";

/** @deprecated Use GenesisMaidenVoyageWhyJoinCard in the hero row. */
export type GenesisMaidenVoyageUtilityRailProps = {
  stats: MaidenVoyageStatsBarData;
};

/** @deprecated Use GenesisMaidenVoyageWhyJoinCard in the hero row. */
export function GenesisMaidenVoyageUtilityRail(
  _props: GenesisMaidenVoyageUtilityRailProps,
) {
  return <GenesisMaidenVoyageWhyJoinCard />;
}
