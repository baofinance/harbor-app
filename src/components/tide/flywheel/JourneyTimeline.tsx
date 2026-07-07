"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { JourneyStageVisualState } from "@/utils/tideRevenueJourney";
import {
  JOURNEY_DESTINATION_FEED_CLASS,
  JOURNEY_DESTINATION_FEED_LINE_ACTIVE_CLASS,
  JOURNEY_DESTINATION_FEED_LINE_CLASS,
  JOURNEY_DOWN_CHEVRON_ACTIVE_CLASS,
  JOURNEY_DOWN_CHEVRON_CLASS,
  JOURNEY_STAGE_COLUMN_CLASS,
  JOURNEY_STAGE_GRID_CLASS,
  JOURNEY_TIMELINE_CARD_SLOT_CLASS,
} from "./revenueJourneyStyles";

export type JourneyTimelineStage = {
  id: string;
  visualState: JourneyStageVisualState;
  card: ReactNode;
};

export type JourneyTimelineProps = {
  stages: JourneyTimelineStage[];
};

export function JourneyTimeline({ stages }: JourneyTimelineProps) {
  return (
    <ol
      className={JOURNEY_STAGE_GRID_CLASS}
      aria-label="Revenue allocation stages"
    >
      {stages.map((stage) => {
        const isActive = stage.visualState === "active";

        return (
          <li key={stage.id} className={JOURNEY_STAGE_COLUMN_CLASS}>
            <div className={JOURNEY_DESTINATION_FEED_CLASS} aria-hidden>
              <div
                className={
                  isActive
                    ? JOURNEY_DESTINATION_FEED_LINE_ACTIVE_CLASS
                    : JOURNEY_DESTINATION_FEED_LINE_CLASS
                }
              />
              <ChevronDownIcon
                className={
                  isActive
                    ? JOURNEY_DOWN_CHEVRON_ACTIVE_CLASS
                    : JOURNEY_DOWN_CHEVRON_CLASS
                }
              />
            </div>

            <div className={JOURNEY_TIMELINE_CARD_SLOT_CLASS}>{stage.card}</div>
          </li>
        );
      })}
    </ol>
  );
}
