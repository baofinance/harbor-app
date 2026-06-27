"use client";

import type { ReactNode } from "react";
import {
  TIDE_FLYWHEEL_CARD_ACTIVE,
  TIDE_FLYWHEEL_CARD_BASE,
  TIDE_FLYWHEEL_CARD_DESC,
  TIDE_FLYWHEEL_CARD_INACTIVE,
  TIDE_FLYWHEEL_CARD_TITLE,
  TIDE_FLYWHEEL_CAPTION,
  TIDE_FLYWHEEL_ICON_BADGE,
  TIDE_FLYWHEEL_INACTIVE_BADGE,
  TIDE_FLYWHEEL_PROGRESS_FILL,
  TIDE_FLYWHEEL_PROGRESS_FILL_COMPLETE,
  TIDE_FLYWHEEL_PROGRESS_TRACK,
  TIDE_FLYWHEEL_STAT_LABEL,
  TIDE_FLYWHEEL_STAT_SUB,
  TIDE_FLYWHEEL_STAT_VALUE,
  TIDE_FLYWHEEL_TARGET_BADGE,
} from "./tideFlywheelStyles";

export type TideFlywheelStepCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  statLabel: string;
  statValue: ReactNode;
  statSubValue?: ReactNode;
  footer?: string;
  isActive?: boolean;
  progressPct?: number | null;
  progressTargetPct?: number;
  targetReachedLabel?: string;
  inactiveBadge?: string;
  pendingFootnote?: string;
};

export function TideFlywheelStepCard({
  icon,
  title,
  description,
  statLabel,
  statValue,
  statSubValue,
  footer,
  isActive = false,
  progressPct = null,
  progressTargetPct,
  targetReachedLabel,
  inactiveBadge,
  pendingFootnote,
}: TideFlywheelStepCardProps) {
  const showProgress =
    progressTargetPct != null && progressTargetPct > 0;
  const clampedPct = showProgress
    ? Math.min(100, Math.max(0, progressPct ?? 0))
    : 0;
  const targetReached =
    showProgress && clampedPct >= progressTargetPct;

  return (
    <article
      className={`${TIDE_FLYWHEEL_CARD_BASE} text-center ${
        isActive ? TIDE_FLYWHEEL_CARD_ACTIVE : TIDE_FLYWHEEL_CARD_INACTIVE
      }`}
    >
      <div className="flex flex-col items-center gap-2.5">
        <span className={TIDE_FLYWHEEL_ICON_BADGE} aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className={TIDE_FLYWHEEL_CARD_TITLE}>{title}</h3>
          <p className={TIDE_FLYWHEEL_CARD_DESC}>{description}</p>
        </div>
      </div>

      <div className="mt-4 flex-1">
        {statLabel ? (
          <>
            <p className={TIDE_FLYWHEEL_STAT_LABEL}>{statLabel}</p>
            <p className={TIDE_FLYWHEEL_STAT_VALUE}>{statValue}</p>
            {statSubValue ? (
              <p className={`mt-0.5 ${TIDE_FLYWHEEL_STAT_SUB}`}>{statSubValue}</p>
            ) : null}
          </>
        ) : null}

        {inactiveBadge ? (
          <div className="mt-3 flex justify-center">
            <span className={TIDE_FLYWHEEL_INACTIVE_BADGE}>{inactiveBadge}</span>
          </div>
        ) : null}

        {showProgress ? (
          <div className="relative mt-3 overflow-hidden">
            <div
              className={`h-2.5 ${TIDE_FLYWHEEL_PROGRESS_TRACK}`}
              role="progressbar"
              aria-valuenow={Math.round(clampedPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${title} progress`}
            >
              <div
                className={
                  targetReached
                    ? TIDE_FLYWHEEL_PROGRESS_FILL_COMPLETE
                    : TIDE_FLYWHEEL_PROGRESS_FILL
                }
                style={{ width: `${clampedPct}%` }}
              />
            </div>
            {targetReached && targetReachedLabel ? (
              <span className={TIDE_FLYWHEEL_TARGET_BADGE}>
                {targetReachedLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {footer || pendingFootnote ? (
        <p className={`mt-3 ${TIDE_FLYWHEEL_CAPTION}`}>
          {pendingFootnote ?? footer}
        </p>
      ) : null}
    </article>
  );
}
