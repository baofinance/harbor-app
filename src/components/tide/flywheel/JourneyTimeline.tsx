"use client";

import type { ReactNode } from "react";
import type { JourneyStageVisualState } from "@/utils/tideRevenueJourney";
import { JourneyConnector } from "./JourneyConnector";
import {
  JOURNEY_TIMELINE_CARD_SLOT_CLASS,
  JOURNEY_TIMELINE_CONNECTOR_ITEM_CLASS,
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
        {stages.flatMap((stage, index) => {
          const isLast = index === stages.length - 1;
          const nextActive =
            !isLast && stages[index + 1]?.visualState === "active";
          const pathActive =
            stage.visualState === "active" || nextActive;

          const items = [
            <li key={stage.id} className={JOURNEY_TIMELINE_ITEM_CLASS}>
              <div className={JOURNEY_TIMELINE_CARD_SLOT_CLASS}>{stage.card}</div>
            </li>,
          ];

          if (!isLast) {
            items.push(
              <li
                key={`${stage.id}-connector`}
                className={JOURNEY_TIMELINE_CONNECTOR_ITEM_CLASS}
                aria-hidden
              >
                <JourneyConnector isActivePath={pathActive} />
              </li>,
            );
          }

          return items;
        })}
      </ol>
    </div>
  );
}
