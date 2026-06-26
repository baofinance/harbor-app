"use client";

import type { ReactNode } from "react";
import SimpleTooltip from "@/components/SimpleTooltip";
import { TIDE_FLYWHEEL_META, TIDE_FLYWHEEL_REVENUE_PILL } from "./tideFlywheelStyles";

export type TideFlywheelHeaderProps = {
  title: string;
  subtitle: string;
  revenueLabel: string;
  revenueValue: string;
  revenueLoading?: boolean;
  revenueDisclaimer?: string;
};

export function TideFlywheelHeader({
  title,
  subtitle,
  revenueLabel,
  revenueValue,
  revenueLoading = false,
  revenueDisclaimer,
}: TideFlywheelHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {title}
          </h2>
          {revenueDisclaimer ? (
            <SimpleTooltip label={revenueDisclaimer}>
              <span
                className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-white/15 text-[11px] font-semibold text-white/50"
                aria-label="Revenue estimate details"
              >
                i
              </span>
            </SimpleTooltip>
          ) : null}
        </div>
        <p className={`mt-1 max-w-xl ${TIDE_FLYWHEEL_META}`}>{subtitle}</p>
      </div>
      <div className={TIDE_FLYWHEEL_REVENUE_PILL}>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
          {revenueLabel}
        </span>
        <span className="font-mono text-base font-bold tabular-nums text-white sm:text-lg">
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
    <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-white/[0.08] bg-[#0a1929]/55 p-4 backdrop-blur-md sm:grid-cols-2 sm:gap-6 sm:p-5">
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
    </div>
  );
}
