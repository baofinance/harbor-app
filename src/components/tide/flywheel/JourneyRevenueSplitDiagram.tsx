"use client";

import type { ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  JOURNEY_MARKET_BOX_ACTIVE_CLASS,
  JOURNEY_MARKET_BOX_INACTIVE_CLASS,
  JOURNEY_MARKET_BOX_LOADING_CLASS,
  JOURNEY_MARKET_GRID_CLASS,
  JOURNEY_REVENUE_BANNER_VALUE_CLASS,
  JOURNEY_REVENUE_COLUMN_CLASS,
  JOURNEY_REVENUE_LABEL_CLASS,
  JOURNEY_REVENUE_SOURCE_BOX_CLASS,
  JOURNEY_REVENUE_TAGLINE_CLASS,
  JOURNEY_SPLIT_BOTTOM_ROW_CLASS,
  JOURNEY_SPLIT_BRANCH_BODY_CLASS,
  JOURNEY_SPLIT_BRANCH_DESC_CLASS,
  JOURNEY_SPLIT_BRANCH_LABEL_CLASS,
  JOURNEY_SPLIT_BRANCH_PCT_REINVEST_CLASS,
  JOURNEY_SPLIT_BRANCH_PCT_TIDE_CLASS,
  JOURNEY_SPLIT_BRANCH_REINVEST_CLASS,
  JOURNEY_SPLIT_BRANCH_TIDE_CLASS,
  JOURNEY_SPLIT_CHIPS_LABEL_CLASS,
  JOURNEY_SPLIT_CONNECTOR_MOBILE_CHEVRON_CLASS,
  JOURNEY_SPLIT_CONNECTOR_MOBILE_CLASS,
  JOURNEY_SPLIT_CONNECTOR_MOBILE_LINE_CLASS,
  JOURNEY_SPLIT_CONNECTOR_MOBILE_LINE_TIDE_CLASS,
  JOURNEY_SPLIT_DIAGRAM_CLASS,
  JOURNEY_SPLIT_DOWN_CHEVRON_ICON_CLASS,
  JOURNEY_SPLIT_DOWN_CONNECTOR_CLASS,
  JOURNEY_SPLIT_DOWN_LINE_CLASS,
  JOURNEY_SPLIT_RIGHT_CHEVRON_CLASS,
  JOURNEY_SPLIT_RIGHT_CONNECTOR_CLASS,
  JOURNEY_SPLIT_RIGHT_LINE_CLASS,
  JOURNEY_SPLIT_TOP_ROW_CLASS,
  JOURNEY_TIDE_HEADER_CLASS,
  JOURNEY_TIDE_STAGE_GRID_CLASS,
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

export type JourneyRevenueSplitDiagramProps = {
  sourceLabel: string;
  sourceValue: string;
  sourceTagline?: string;
  /** Right branch — reinvested revenue. */
  reinvest: JourneyRevenueSplitBranch;
  /** Bottom branch — strengthens TIDE, holds the stage cards. */
  strengthenTide: JourneyRevenueSplitBranch;
  /** Treasury / POL / Burn stage cards rendered inside the Strengthen TIDE box. */
  stageCards?: ReactNode;
};

export function JourneyRevenueSplitDiagram({
  sourceLabel,
  sourceValue,
  sourceTagline,
  reinvest,
  strengthenTide,
  stageCards,
}: JourneyRevenueSplitDiagramProps) {
  const hasMarkets =
    !!reinvest.activeMarkets?.length ||
    !!reinvest.loadingMarkets?.length ||
    !!reinvest.inactiveMarkets?.length;

  return (
    <div className={JOURNEY_SPLIT_DIAGRAM_CLASS}>
      <div className={JOURNEY_SPLIT_TOP_ROW_CLASS}>
        <div className={JOURNEY_REVENUE_COLUMN_CLASS}>
          <div className={JOURNEY_REVENUE_SOURCE_BOX_CLASS}>
            <p className={JOURNEY_REVENUE_LABEL_CLASS}>{sourceLabel}</p>
            <p className={JOURNEY_REVENUE_BANNER_VALUE_CLASS}>{sourceValue}</p>
            {sourceTagline ? (
              <p className={JOURNEY_REVENUE_TAGLINE_CLASS}>{sourceTagline}</p>
            ) : null}
          </div>
        </div>

        <div className={JOURNEY_SPLIT_RIGHT_CONNECTOR_CLASS} aria-hidden>
          <div className={JOURNEY_SPLIT_RIGHT_LINE_CLASS} />
          <ChevronRightIcon className={JOURNEY_SPLIT_RIGHT_CHEVRON_CLASS} />
        </div>

        <div className={JOURNEY_SPLIT_CONNECTOR_MOBILE_CLASS} aria-hidden>
          <div className={JOURNEY_SPLIT_CONNECTOR_MOBILE_LINE_CLASS} />
          <ChevronDownIcon
            className={`${JOURNEY_SPLIT_CONNECTOR_MOBILE_CHEVRON_CLASS} text-[#1E4775]/55`}
          />
        </div>

        <div className={JOURNEY_SPLIT_BRANCH_REINVEST_CLASS}>
          <span className={JOURNEY_SPLIT_BRANCH_PCT_REINVEST_CLASS}>
            {reinvest.pct}%
          </span>
          <div className={JOURNEY_SPLIT_BRANCH_BODY_CLASS}>
            <p className={JOURNEY_SPLIT_BRANCH_LABEL_CLASS}>{reinvest.label}</p>
            <p className={JOURNEY_SPLIT_BRANCH_DESC_CLASS}>
              {reinvest.description}
            </p>
            {hasMarkets ? (
              <div className="mt-2">
                {reinvest.yieldLabel ? (
                  <span className={JOURNEY_SPLIT_CHIPS_LABEL_CLASS}>
                    {reinvest.yieldLabel}
                  </span>
                ) : null}
                <div className={JOURNEY_MARKET_GRID_CLASS}>
                  {reinvest.activeMarkets?.map((market) => (
                    <span
                      key={market}
                      className={JOURNEY_MARKET_BOX_ACTIVE_CLASS}
                    >
                      {market}
                    </span>
                  ))}
                  {reinvest.loadingMarkets?.map((market) => (
                    <span
                      key={market}
                      className={JOURNEY_MARKET_BOX_LOADING_CLASS}
                    >
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
                      className={JOURNEY_MARKET_BOX_INACTIVE_CLASS}
                    >
                      {market}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={JOURNEY_SPLIT_DOWN_CONNECTOR_CLASS} aria-hidden>
        <div className={JOURNEY_SPLIT_DOWN_LINE_CLASS} />
        <ChevronDownIcon className={JOURNEY_SPLIT_DOWN_CHEVRON_ICON_CLASS} />
      </div>

      <div className={JOURNEY_SPLIT_CONNECTOR_MOBILE_CLASS} aria-hidden>
        <div className={JOURNEY_SPLIT_CONNECTOR_MOBILE_LINE_TIDE_CLASS} />
        <ChevronDownIcon
          className={`${JOURNEY_SPLIT_CONNECTOR_MOBILE_CHEVRON_CLASS} text-harbor-coral`}
        />
      </div>

      <div className={JOURNEY_SPLIT_BOTTOM_ROW_CLASS}>
        <div className={JOURNEY_SPLIT_BRANCH_TIDE_CLASS}>
          <div className={JOURNEY_TIDE_HEADER_CLASS}>
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
            </div>
          </div>

          {stageCards ? (
            <div className={JOURNEY_TIDE_STAGE_GRID_CLASS}>{stageCards}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
