"use client";

import type { ReactNode } from "react";
import {
  MV_HEADLINE,
  MV_HEADLINE_ACCENT,
  MV_HEADLINE_PRIMARY,
} from "@/components/genesis/maidenVoyageLayoutStyles";
import {
  TIDE_FLYWHEEL_FOOTER_PANEL,
  TIDE_FLYWHEEL_META,
  TIDE_FLYWHEEL_REVENUE_PILL,
  TIDE_FLYWHEEL_STAT_LABEL,
  TIDE_FLYWHEEL_STAT_VALUE,
} from "./tideFlywheelStyles";

export type TideFlywheelHeaderProps = {
  titlePrimary: string;
  titleAccent: string;
  subtitle: string;
  revenueLabel: string;
  revenueValue: string;
  revenueLoading?: boolean;
};

export function TideFlywheelHeader({
  titlePrimary,
  titleAccent,
  subtitle,
  revenueLabel,
  revenueValue,
  revenueLoading = false,
}: TideFlywheelHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 [container-type:inline-size]">
        <h2 className={MV_HEADLINE}>
          <span className={MV_HEADLINE_PRIMARY}>{titlePrimary}</span>
          <span className={MV_HEADLINE_ACCENT}>{titleAccent}</span>
        </h2>
        <p className={`mt-1 max-w-xl ${TIDE_FLYWHEEL_META}`}>{subtitle}</p>
      </div>
      <div className={TIDE_FLYWHEEL_REVENUE_PILL}>
        <span className={TIDE_FLYWHEEL_STAT_LABEL}>{revenueLabel}</span>
        <span className={TIDE_FLYWHEEL_STAT_VALUE}>
          {revenueLoading ? "…" : revenueValue}
        </span>
      </div>
    </div>
  );
}

export type TideFlywheelFooterProps = {
  aboutTitle: string;
  aboutBody: string;
  takeawayTitle: string;
  takeawayBody: string;
  icon?: ReactNode;
};

export function TideFlywheelFooter({
  aboutTitle,
  aboutBody,
  takeawayTitle,
  takeawayBody,
  icon,
}: TideFlywheelFooterProps) {
  return (
    <footer
      className={`${TIDE_FLYWHEEL_FOOTER_PANEL} grid grid-cols-1 gap-4 px-3 py-4 sm:grid-cols-2 sm:gap-6 sm:px-4 sm:py-5`}
    >
      <div className="min-w-0">
        <div className="flex items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 shrink-0 text-[#FF8A7A]" aria-hidden>
              {icon}
            </span>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-white">{aboutTitle}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">
              {aboutBody}
            </p>
          </div>
        </div>
      </div>
      <div className="min-w-0 sm:border-l sm:border-white/[0.08] sm:pl-6">
        <h3 className="text-sm font-semibold text-white">{takeawayTitle}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-white/55">
          {takeawayBody}
        </p>
      </div>
    </footer>
  );
}
