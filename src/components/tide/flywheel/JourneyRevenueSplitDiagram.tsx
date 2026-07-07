"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  JOURNEY_REVENUE_BANNER_VALUE_CLASS,
  JOURNEY_REVENUE_LABEL_CLASS,
  JOURNEY_REVENUE_TAGLINE_CLASS,
  JOURNEY_SPLIT_BRANCH_BODY_CLASS,
  JOURNEY_SPLIT_BRANCH_DESC_CLASS,
  JOURNEY_SPLIT_BRANCH_LABEL_CLASS,
  JOURNEY_SPLIT_BRANCH_PCT_REINVEST_CLASS,
  JOURNEY_SPLIT_BRANCH_PCT_TIDE_CLASS,
  JOURNEY_SPLIT_BRANCH_REINVEST_CLASS,
  JOURNEY_SPLIT_BRANCH_TIDE_CLASS,
  JOURNEY_SPLIT_BRANCHES_CLASS,
  JOURNEY_SPLIT_CHIP_ACTIVE_CLASS,
  JOURNEY_SPLIT_CHIP_INACTIVE_CLASS,
  JOURNEY_SPLIT_CHIP_TIDE_CLASS,
  JOURNEY_SPLIT_CHIPS_LABEL_CLASS,
  JOURNEY_SPLIT_CHIPS_ROW_CLASS,
  JOURNEY_SPLIT_CONNECTOR_CLASS,
  JOURNEY_SPLIT_CONNECTOR_MOBILE_CLASS,
  JOURNEY_SPLIT_DIAGRAM_CLASS,
  JOURNEY_SPLIT_SOURCE_CLASS,
} from "./revenueJourneyStyles";

export type JourneyRevenueSplitBranch = {
  pct: number;
  label: string;
  description: string;
  yieldLabel?: string;
  activeMarkets?: readonly string[];
  inactiveMarkets?: readonly string[];
  destinations?: readonly string[];
};

export type JourneyRevenueSplitDiagramProps = {
  sourceLabel: string;
  sourceValue: string;
  sourceTagline?: string;
  /** Top branch — reinvested revenue. */
  reinvest: JourneyRevenueSplitBranch;
  /** Bottom branch — strengthens TIDE, feeds the stages below. */
  strengthenTide: JourneyRevenueSplitBranch;
};

export function JourneyRevenueSplitDiagram({
  sourceLabel,
  sourceValue,
  sourceTagline,
  reinvest,
  strengthenTide,
}: JourneyRevenueSplitDiagramProps) {
  return (
    <div className={JOURNEY_SPLIT_DIAGRAM_CLASS}>
      <div className={JOURNEY_SPLIT_SOURCE_CLASS}>
        <p className={JOURNEY_REVENUE_LABEL_CLASS}>{sourceLabel}</p>
        <p className={JOURNEY_REVENUE_BANNER_VALUE_CLASS}>{sourceValue}</p>
        {sourceTagline ? (
          <p className={JOURNEY_REVENUE_TAGLINE_CLASS}>{sourceTagline}</p>
        ) : null}
      </div>

      <svg
        className={JOURNEY_SPLIT_CONNECTOR_CLASS}
        viewBox="0 0 56 100"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 50 H28 M28 25 V75 M28 25 H56 M28 75 H56"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <div className={JOURNEY_SPLIT_CONNECTOR_MOBILE_CLASS} aria-hidden>
        <ChevronDownIcon className="h-5 w-5" />
      </div>

      <div className={JOURNEY_SPLIT_BRANCHES_CLASS}>
        <div className={JOURNEY_SPLIT_BRANCH_REINVEST_CLASS}>
          <span className={JOURNEY_SPLIT_BRANCH_PCT_REINVEST_CLASS}>
            {reinvest.pct}%
          </span>
          <div className={JOURNEY_SPLIT_BRANCH_BODY_CLASS}>
            <p className={JOURNEY_SPLIT_BRANCH_LABEL_CLASS}>{reinvest.label}</p>
            <p className={JOURNEY_SPLIT_BRANCH_DESC_CLASS}>
              {reinvest.description}
            </p>
            {reinvest.activeMarkets?.length ||
            reinvest.inactiveMarkets?.length ? (
              <div className={JOURNEY_SPLIT_CHIPS_ROW_CLASS}>
                {reinvest.yieldLabel ? (
                  <span className={JOURNEY_SPLIT_CHIPS_LABEL_CLASS}>
                    {reinvest.yieldLabel}
                  </span>
                ) : null}
                {reinvest.activeMarkets?.map((market) => (
                  <span key={market} className={JOURNEY_SPLIT_CHIP_ACTIVE_CLASS}>
                    {market}
                  </span>
                ))}
                {reinvest.inactiveMarkets?.map((market) => (
                  <span
                    key={market}
                    className={JOURNEY_SPLIT_CHIP_INACTIVE_CLASS}
                  >
                    {market}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={JOURNEY_SPLIT_BRANCH_TIDE_CLASS}>
          <span className={JOURNEY_SPLIT_BRANCH_PCT_TIDE_CLASS}>
            {strengthenTide.pct}%
          </span>
          <div className={JOURNEY_SPLIT_BRANCH_BODY_CLASS}>
            <p className={JOURNEY_SPLIT_BRANCH_LABEL_CLASS}>
              {strengthenTide.label}
            </p>
            <p className={JOURNEY_SPLIT_BRANCH_DESC_CLASS}>
              {strengthenTide.description}
            </p>
            {strengthenTide.destinations?.length ? (
              <div className={JOURNEY_SPLIT_CHIPS_ROW_CLASS}>
                {strengthenTide.destinations.map((destination) => (
                  <span
                    key={destination}
                    className={JOURNEY_SPLIT_CHIP_TIDE_CLASS}
                  >
                    {destination}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
