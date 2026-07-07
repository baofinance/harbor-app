"use client";

import type { ReactNode } from "react";
import type { JourneyStageVisualState } from "@/utils/tideRevenueJourney";
import { JourneyConnector } from "./JourneyConnector";
import {
  JOURNEY_TIMELINE_ENTRY_CLASS,
  JOURNEY_TIMELINE_ITEM_CLASS,
  JOURNEY_TIMELINE_LIST_CLASS,
} from "./revenueJourneyStyles";

export type JourneyTimelineStage = {
  id: string;
  visualState: JourneyStageVisualState;
  card: ReactNode;
};

export type JourneyTimelineProps = {
  entryLabel: string;
  stages: JourneyTimelineStage[];
};

export function JourneyTimeline({ entryLabel, stages }: JourneyTimelineProps) {
  return (
    <div>
      <p className={JOURNEY_TIMELINE_ENTRY_CLASS}>{entryLabel}</p>
      <ol className={`mt-3 ${JOURNEY_TIMELINE_LIST_CLASS}`} aria-label="Revenue journey stages">
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const nextActive =
            !isLast && stages[index + 1]?.visualState === "active";
          const pathActive =
            stage.visualState === "active" || nextActive;

          return (
            <li key={stage.id} className={JOURNEY_TIMELINE_ITEM_CLASS}>
              <div className="min-w-0 flex-1">{stage.card}</div>
              {!isLast ? <JourneyConnector isActivePath={pathActive} /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
