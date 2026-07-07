"use client";

import {
  JOURNEY_REVENUE_SPLIT_BRANCH_CLASS,
  JOURNEY_REVENUE_SPLIT_BRANCH_DESC_CLASS,
  JOURNEY_REVENUE_SPLIT_BRANCH_LABEL_CLASS,
  JOURNEY_REVENUE_SPLIT_BRANCH_PCT_CLASS,
  JOURNEY_REVENUE_SPLIT_BRANCHES_CLASS,
  JOURNEY_REVENUE_SPLIT_CONNECTOR_CLASS,
  JOURNEY_REVENUE_SPLIT_DIAGRAM_CLASS,
  JOURNEY_REVENUE_SPLIT_SOURCE_CLASS,
  JOURNEY_REVENUE_SPLIT_SOURCE_LABEL_CLASS,
  JOURNEY_REVENUE_SPLIT_SOURCE_TITLE_CLASS,
} from "./revenueJourneyStyles";

export type JourneyRevenueSplitBranch = {
  pct: number;
  label: string;
  description: string;
};

export type JourneyRevenueSplitDiagramProps = {
  sourceLabel: string;
  sourceTitle: string;
  branches: [JourneyRevenueSplitBranch, JourneyRevenueSplitBranch];
};

export function JourneyRevenueSplitDiagram({
  sourceLabel,
  sourceTitle,
  branches,
}: JourneyRevenueSplitDiagramProps) {
  const [leftBranch, rightBranch] = branches;

  return (
    <div className={JOURNEY_REVENUE_SPLIT_DIAGRAM_CLASS}>
      <div className={JOURNEY_REVENUE_SPLIT_SOURCE_CLASS}>
        <p className={JOURNEY_REVENUE_SPLIT_SOURCE_LABEL_CLASS}>{sourceLabel}</p>
        <p className={JOURNEY_REVENUE_SPLIT_SOURCE_TITLE_CLASS}>{sourceTitle}</p>
      </div>

      <svg
        className={JOURNEY_REVENUE_SPLIT_CONNECTOR_CLASS}
        viewBox="0 0 240 32"
        fill="none"
        aria-hidden
      >
        <path
          d="M120 0V10M30 10H210M30 10V32M210 10V32"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <div className={JOURNEY_REVENUE_SPLIT_BRANCHES_CLASS}>
        {[leftBranch, rightBranch].map((branch) => (
          <div key={branch.label} className={JOURNEY_REVENUE_SPLIT_BRANCH_CLASS}>
            <p className={JOURNEY_REVENUE_SPLIT_BRANCH_PCT_CLASS}>{branch.pct}%</p>
            <p className={JOURNEY_REVENUE_SPLIT_BRANCH_LABEL_CLASS}>{branch.label}</p>
            <p className={JOURNEY_REVENUE_SPLIT_BRANCH_DESC_CLASS}>
              {branch.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
