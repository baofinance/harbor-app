"use client";

import {
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  FireIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import { Droplets, Sunrise } from "lucide-react";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";
import { useTideFlywheelMetrics } from "@/hooks/useTideFlywheelMetrics";
import { formatUSD } from "@/utils/formatters";
import { TideFlywheelFooter, TideFlywheelHeader } from "./TideFlywheelHeader";
import { TideFlywheelStepCard } from "./TideFlywheelStepCard";
import {
  TIDE_FLYWHEEL_ARROW,
  TIDE_FLYWHEEL_CONTENT_CLASS,
  TIDE_FLYWHEEL_DESKTOP_ROW,
  TIDE_FLYWHEEL_SCROLL_ROW,
  TIDE_FLYWHEEL_SECTION_CLASS,
} from "./tideFlywheelStyles";

function formatPct(value: number | null | undefined): string {
  const n = value ?? 0;
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

function formatTideTokens(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0 TIDE";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} TIDE`;
}

function StepArrow() {
  return (
    <ChevronRightIcon
      className={TIDE_FLYWHEEL_ARROW}
      width={20}
      height={20}
      aria-hidden
    />
  );
}

export function TideValueFlywheel() {
  const metrics = useTideFlywheelMetrics();
  const copy = TIDE_FLYWHEEL_CONFIG.copy;

  const lifetimeRevenueDisplay = metrics.isLoading
    ? "…"
    : formatUSD(metrics.lifetimeRevenueUsd ?? 0, { compact: false });

  const treasuryPct = metrics.treasury.ownershipPct ?? 0;
  const polPct = metrics.pol.ownershipPct ?? 0;
  const burnPct = metrics.burn.supplyBurnedPct ?? 0;

  return (
    <section className={TIDE_FLYWHEEL_SECTION_CLASS} aria-label="TIDE Value Flywheel">
      <div className={TIDE_FLYWHEEL_CONTENT_CLASS}>
        <TideFlywheelHeader
          title={copy.title}
          subtitle={copy.subtitle}
          revenueLabel={copy.revenuePillLabel}
          revenueValue={lifetimeRevenueDisplay}
          revenueLoading={metrics.isLoading}
        />

        <div className={TIDE_FLYWHEEL_SCROLL_ROW}>
          <div className={TIDE_FLYWHEEL_DESKTOP_ROW}>
          <TideFlywheelStepCard
            icon={<ArrowPathIcon className="h-5 w-5" strokeWidth={2} />}
            title={copy.steps.buybacks.title}
            description={copy.steps.buybacks.description}
            statLabel={copy.steps.buybacks.statLabel}
            statValue={
              metrics.isLoading ? "…" : formatTideTokens(metrics.buyback.tideTokens)
            }
            statSubValue={formatUSD(metrics.buyback.usd, { compact: false })}
            footer={copy.steps.buybacks.footer}
          />

          <StepArrow />

          <TideFlywheelStepCard
            icon={<ShieldCheckIcon className="h-5 w-5" />}
            title={copy.steps.treasury.title}
            description={copy.steps.treasury.description}
            statLabel={copy.steps.treasury.statLabel}
            statValue={metrics.isLoading ? "…" : formatPct(treasuryPct)}
            footer={copy.steps.treasury.targetLabel}
            isActive={metrics.activeStage === "treasury"}
            progressPct={treasuryPct}
            progressTargetPct={metrics.treasury.targetPct}
            targetReachedLabel={
              metrics.treasury.targetReached
                ? copy.steps.treasury.targetReached
                : undefined
            }
          />

          <StepArrow />

          <TideFlywheelStepCard
            icon={<Droplets className="h-5 w-5" strokeWidth={1.75} />}
            title={copy.steps.pol.title}
            description={copy.steps.pol.description}
            statLabel={copy.steps.pol.statLabel}
            statValue={metrics.isLoading ? "…" : formatPct(polPct)}
            footer={copy.steps.pol.targetLabel}
            isActive={metrics.activeStage === "pol"}
            progressPct={polPct}
            progressTargetPct={metrics.pol.targetPct}
          />

          <StepArrow />

          <TideFlywheelStepCard
            icon={<FireIcon className="h-5 w-5" />}
            title={copy.steps.burn.title}
            description={copy.steps.burn.description}
            statLabel={copy.steps.burn.statLabel}
            statValue={metrics.isLoading ? "…" : formatPct(burnPct)}
            footer={copy.steps.burn.footer}
            isActive={metrics.activeStage === "burn"}
            progressPct={burnPct}
            progressTargetPct={100}
          />
        </div>
      </div>
      </div>

      <TideFlywheelFooter
        aboutTitle={copy.footer.aboutTitle}
        aboutBody={copy.footer.aboutBody}
        takeawayTitle={copy.footer.takeawayTitle}
        takeawayBody={copy.footer.takeawayBody}
        icon={<Sunrise className="h-5 w-5" strokeWidth={1.75} />}
      />
    </section>
  );
}
