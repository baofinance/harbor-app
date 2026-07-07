"use client";

import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Fragment } from "react";
import type { JourneyStageVisualState } from "@/utils/tideRevenueJourney";
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
  JOURNEY_SPLIT_CHIP_LOADING_CLASS,
  JOURNEY_SPLIT_CHIPS_LABEL_CLASS,
  JOURNEY_SPLIT_CHIPS_ROW_CLASS,
  JOURNEY_SPLIT_CONNECTOR_CLASS,
  JOURNEY_SPLIT_CONNECTOR_MOBILE_CLASS,
  JOURNEY_SPLIT_DIAGRAM_CLASS,
  JOURNEY_SPLIT_SOURCE_CLASS,
  JOURNEY_TIDE_DEST_CHIP_ACTIVE_CLASS,
  JOURNEY_TIDE_DEST_CHIP_COMPLETE_CLASS,
  JOURNEY_TIDE_DEST_CHIP_FUTURE_CLASS,
} from "./revenueJourneyStyles";

export type JourneyRevenueSplitBranch = {
  pct: number;
  label: string;
  description: string;
  yieldLabel?: string;
  activeMarkets?: readonly string[];
  loadingMarkets?: readonly string[];
  inactiveMarkets?: readonly string[];
  destinations?: readonly string[];
};

export type JourneyTideDestination = {
  label: string;
  state: JourneyStageVisualState;
};

export type JourneyRevenueSplitDiagramProps = {
  sourceLabel: string;
  sourceValue: string;
  sourceTagline?: string;
  /** Top branch — reinvested revenue. */
  reinvest: JourneyRevenueSplitBranch;
  /** Bottom branch — strengthens TIDE, feeds the stages below. */
  strengthenTide: JourneyRevenueSplitBranch;
  /** Destination chips (Treasury / POL / Burn) shown inside the TIDE branch. */
  tideDestinations?: JourneyTideDestination[];
};

function tideDestChipClass(state: JourneyStageVisualState): string {
  if (state === "active") return JOURNEY_TIDE_DEST_CHIP_ACTIVE_CLASS;
  if (state === "complete") return JOURNEY_TIDE_DEST_CHIP_COMPLETE_CLASS;
  return JOURNEY_TIDE_DEST_CHIP_FUTURE_CLASS;
}

export function JourneyRevenueSplitDiagram({
  sourceLabel,
  sourceValue,
  sourceTagline,
  reinvest,
  strengthenTide,
  tideDestinations,
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
            reinvest.loadingMarkets?.length ||
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
                {reinvest.loadingMarkets?.map((market) => (
                  <span key={market} className={JOURNEY_SPLIT_CHIP_LOADING_CLASS}>
                    <span
                      className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#1E4775]/50"
                      aria-hidden
                    />
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
            {tideDestinations?.length ? (
              <div className={JOURNEY_SPLIT_CHIPS_ROW_CLASS}>
                {tideDestinations.map((destination, index) => (
                  <Fragment key={destination.label}>
                    {index > 0 ? (
                      <ChevronRightIcon
                        className="h-3 w-3 shrink-0 text-harbor-coral/50"
                        aria-hidden
                      />
                    ) : null}
                    <span className={tideDestChipClass(destination.state)}>
                      {destination.label}
                    </span>
                  </Fragment>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
