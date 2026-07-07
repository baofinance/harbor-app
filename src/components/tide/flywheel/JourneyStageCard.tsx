"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import type { JourneyStageVisualState } from "@/utils/tideRevenueJourney";
import {
  deriveStageStatusLabel,
  type JourneyStageId,
} from "@/utils/tideRevenueJourney";
import {
  JOURNEY_CHECKMARK_CLASS,
  JOURNEY_PROGRESS_FILL,
  JOURNEY_PROGRESS_FILL_COMPLETE,
  JOURNEY_PROGRESS_TRACK,
  JOURNEY_STAGE_CARD_ACTIVE,
  JOURNEY_STAGE_CARD_BASE,
  JOURNEY_STAGE_CARD_FUTURE,
  JOURNEY_STAGE_ACTIVE_ACCENT_CLASS,
  JOURNEY_STAGE_ACTIVE_BADGE_CLASS,
  JOURNEY_STAGE_DESC_CLASS,
  JOURNEY_STAGE_FOOTER_SLOT_CLASS,
  JOURNEY_STAGE_ICON_BADGE,
  JOURNEY_STAGE_ICON_PULSE,
  JOURNEY_STAGE_METRICS_SLOT_CLASS,
  JOURNEY_STAGE_PROGRESS_SLOT_CLASS,
  JOURNEY_STAGE_STAT_LABEL_CLASS,
  JOURNEY_STAGE_STAT_SUB_CLASS,
  JOURNEY_STAGE_STAT_VALUE_CLASS,
  JOURNEY_STAGE_TITLE_CLASS,
  JOURNEY_STATUS_BADGE_ACTIVE,
  JOURNEY_STATUS_BADGE_COMPLETE,
  JOURNEY_STATUS_BADGE_UPCOMING,
} from "./revenueJourneyStyles";

export type JourneyStageCardProps = {
  stageId: JourneyStageId;
  visualState: JourneyStageVisualState;
  icon: ReactNode;
  title: string;
  description: string;
  statusLabel?: string;
  metricLabel?: string;
  metricValue?: ReactNode;
  metricSubValue?: ReactNode;
  currentLabel?: string;
  currentValue?: ReactNode;
  targetLabel?: string;
  targetValue?: ReactNode;
  progressPct?: number | null;
  progressComplete?: boolean;
  footer?: ReactNode;
};

function statusBadgeClass(state: JourneyStageVisualState): string {
  if (state === "complete") return JOURNEY_STATUS_BADGE_COMPLETE;
  if (state === "active") return JOURNEY_STATUS_BADGE_ACTIVE;
  return JOURNEY_STATUS_BADGE_UPCOMING;
}

export function JourneyStageCard({
  stageId,
  visualState,
  icon,
  title,
  description,
  statusLabel,
  metricLabel,
  metricValue,
  metricSubValue,
  currentLabel,
  currentValue,
  targetLabel,
  targetValue,
  progressPct = null,
  progressComplete = false,
  footer,
}: JourneyStageCardProps) {
  const derivedStatus = deriveStageStatusLabel(stageId, visualState);
  const footerBadgeText =
    visualState === "future"
      ? statusLabel ?? derivedStatus
      : visualState === "complete"
        ? statusLabel
        : null;
  const showFooterBadge = Boolean(footerBadgeText);
  const showProgress = progressPct != null;
  const clampedProgress = showProgress
    ? Math.min(100, Math.max(0, progressPct))
    : 0;
  const showMetricPair = currentLabel != null && targetLabel != null;

  const cardStateClass =
    visualState === "active"
      ? JOURNEY_STAGE_CARD_ACTIVE
      : visualState === "future"
        ? JOURNEY_STAGE_CARD_FUTURE
        : "";

  return (
    <article
      className={`${JOURNEY_STAGE_CARD_BASE} ${cardStateClass}`}
      aria-current={visualState === "active" ? "step" : undefined}
    >
      {visualState === "active" ? (
        <span className={JOURNEY_STAGE_ACTIVE_ACCENT_CLASS} aria-hidden />
      ) : null}

      {visualState === "active" && (statusLabel ?? derivedStatus) ? (
        <span className={JOURNEY_STAGE_ACTIVE_BADGE_CLASS}>
          <span className={JOURNEY_STATUS_BADGE_ACTIVE}>
            {statusLabel ?? derivedStatus}
          </span>
        </span>
      ) : null}

      {visualState === "complete" ? (
        <span className={JOURNEY_CHECKMARK_CLASS} aria-hidden>
          <CheckIcon className="h-3 w-3" />
        </span>
      ) : null}

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {visualState === "active" ? (
            <span className={JOURNEY_STAGE_ICON_PULSE} aria-hidden />
          ) : null}
          <span className={`relative ${JOURNEY_STAGE_ICON_BADGE}`} aria-hidden>
            {icon}
          </span>
        </div>
        <h3 className={`mt-3 ${JOURNEY_STAGE_TITLE_CLASS}`}>{title}</h3>
        <p className={JOURNEY_STAGE_DESC_CLASS}>{description}</p>
      </div>

      <div className="flex flex-1 flex-col">
        <div className={JOURNEY_STAGE_METRICS_SLOT_CLASS}>
          {metricLabel ? (
            <>
              <p className={JOURNEY_STAGE_STAT_LABEL_CLASS}>{metricLabel}</p>
              <p className={JOURNEY_STAGE_STAT_VALUE_CLASS}>{metricValue}</p>
              {metricSubValue ? (
                <p className={`mt-0.5 ${JOURNEY_STAGE_STAT_SUB_CLASS}`}>
                  {metricSubValue}
                </p>
              ) : null}
            </>
          ) : null}

          {showMetricPair ? (
            <div className="mt-1 flex w-full justify-center gap-8">
              <div>
                <p className={JOURNEY_STAGE_STAT_LABEL_CLASS}>{currentLabel}</p>
                <p className={JOURNEY_STAGE_STAT_VALUE_CLASS}>{currentValue}</p>
              </div>
              <div>
                <p className={JOURNEY_STAGE_STAT_LABEL_CLASS}>{targetLabel}</p>
                <p className={JOURNEY_STAGE_STAT_VALUE_CLASS}>{targetValue}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className={JOURNEY_STAGE_PROGRESS_SLOT_CLASS}>
          {showProgress ? (
            <div
              className="w-full"
              role="progressbar"
              aria-valuenow={Math.round(clampedProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${title} progress`}
            >
              <div className={JOURNEY_PROGRESS_TRACK}>
                <div
                  className={
                    progressComplete
                      ? `${JOURNEY_PROGRESS_FILL_COMPLETE} h-full rounded-full`
                      : `${JOURNEY_PROGRESS_FILL} h-full rounded-full`
                  }
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className={JOURNEY_STAGE_FOOTER_SLOT_CLASS}>
          {showFooterBadge ? (
            <span className={statusBadgeClass(visualState)}>{footerBadgeText}</span>
          ) : null}

          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>
      </div>
    </article>
  );
}
