"use client";

import {
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  JOURNEY_CONNECTOR_CHEVRON_ACTIVE_CLASS,
  JOURNEY_CONNECTOR_CHEVRON_CLASS,
  JOURNEY_CONNECTOR_HORIZONTAL_CLASS,
  JOURNEY_CONNECTOR_LINE_CLASS,
  JOURNEY_CONNECTOR_VERTICAL_CLASS,
} from "./revenueJourneyStyles";

export type JourneyConnectorProps = {
  isActivePath?: boolean;
};

export function JourneyConnector({ isActivePath = false }: JourneyConnectorProps) {
  const chevronClass = isActivePath
    ? JOURNEY_CONNECTOR_CHEVRON_ACTIVE_CLASS
    : JOURNEY_CONNECTOR_CHEVRON_CLASS;

  return (
    <>
      <div className={JOURNEY_CONNECTOR_VERTICAL_CLASS} aria-hidden>
        <div className={`h-4 w-px ${JOURNEY_CONNECTOR_LINE_CLASS}`} />
        <ChevronDownIcon className={`h-4 w-4 ${chevronClass}`} />
        <div className={`h-4 w-px ${JOURNEY_CONNECTOR_LINE_CLASS}`} />
      </div>
      <div className={JOURNEY_CONNECTOR_HORIZONTAL_CLASS} aria-hidden>
        <div className={`h-px w-3 ${JOURNEY_CONNECTOR_LINE_CLASS}`} />
        <ChevronRightIcon className={`h-4 w-4 ${chevronClass}`} />
        <div className={`h-px w-3 ${JOURNEY_CONNECTOR_LINE_CLASS}`} />
      </div>
    </>
  );
}
