"use client";

import type { RevenueAllocation } from "@/utils/tideRevenueJourney";
import {
  JOURNEY_ALLOCATION_BAR_FILL,
  JOURNEY_ALLOCATION_BAR_TRACK,
  JOURNEY_ALLOCATION_CARD_CLASS,
  JOURNEY_ALLOCATION_LABEL_CLASS,
  JOURNEY_ALLOCATION_TITLE_CLASS,
  JOURNEY_ALLOCATION_VALUE_CLASS,
} from "./revenueJourneyStyles";
import { TIDE_META_TEXT } from "@/components/tide/tideCardStyles";

export type JourneyAllocationCardProps = {
  title: string;
  todayLabel: string;
  futureLabel: string;
  allocation: RevenueAllocation;
};

export function JourneyAllocationCard({
  title,
  todayLabel,
  futureLabel,
  allocation,
}: JourneyAllocationCardProps) {
  return (
    <div className={JOURNEY_ALLOCATION_CARD_CLASS}>
      <p className={JOURNEY_ALLOCATION_TITLE_CLASS}>{title}</p>
      <div className={JOURNEY_ALLOCATION_BAR_TRACK}>
        <div
          className={JOURNEY_ALLOCATION_BAR_FILL}
          style={{ width: `${allocation.todayPct}%` }}
        />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={JOURNEY_ALLOCATION_LABEL_CLASS}>{todayLabel}</p>
          <p className={JOURNEY_ALLOCATION_VALUE_CLASS}>
            {allocation.todayPct}% {allocation.todayLabel}
          </p>
        </div>
        {allocation.futureLabel ? (
          <div className="sm:text-right">
            <p className={JOURNEY_ALLOCATION_LABEL_CLASS}>{futureLabel}</p>
            <p className={TIDE_META_TEXT}>{allocation.futureLabel}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
