"use client";

import {
  ArrowPathIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  CircleStackIcon,
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
  TIDE_FLYWHEEL_DESKTOP_ROW,
  TIDE_FLYWHEEL_SCROLL_ROW,
  TIDE_FLYWHEEL_SECTION_CLASS,
} from "./tideFlywheelStyles";

function formatPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatTideTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
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

  const lifetimeRevenueDisplay =
    metrics.lifetimeRevenueUsd != null && metrics.lifetimeRevenueUsd > 0
      ? formatUSD(metrics.lifetimeRevenueUsd, { compact: false })
      : metrics.isLoading
        ? "…"
        : "—";

  const treasuryDisplay = metrics.tideTokenConfigured
    ? formatPct(metrics.treasury.ownershipPct)
    : "—";

  const polDisplay = metrics.polLpConfigured
    ? formatPct(metrics.pol.ownershipPct)
    : "—";

  const burnDisplay = !metrics.tideTokenConfigured
    ? "—"
    : metrics.isLoading
      ? "…"
      : formatPct(metrics.burn.supplyBurnedPct ?? 0);

  return (
    <section className={TIDE_FLYWHEEL_SECTION_CLASS} aria-label="TIDE Value Flywheel">
      <TideFlywheelHeader
        title={copy.title}
        subtitle={copy.subtitle}
        revenueLabel={copy.revenuePillLabel}
        revenueValue={lifetimeRevenueDisplay}
        revenueLoading={metrics.isLoading}
        revenueDisclaimer={copy.revenueDisclaimer}
      />

      <div className={TIDE_FLYWHEEL_SCROLL_ROW}>
        <div className={TIDE_FLYWHEEL_DESKTOP_ROW}>
          <TideFlywheelStepCard
            icon={<CircleStackIcon className="h-5 w-5" />}
            title={copy.steps.protocolRevenue.title}
            description={copy.steps.protocolRevenue.description}
            statLabel={copy.steps.protocolRevenue.statLabel}
            statValue={lifetimeRevenueDisplay}
            footer={copy.steps.protocolRevenue.footer}
          />

          <StepArrow />

          <TideFlywheelStepCard
            icon={<ArrowPathIcon className="h-5 w-5" strokeWidth={2} />}
            title={copy.steps.buybacks.title}
            description={copy.steps.buybacks.description}
            statLabel={copy.steps.buybacks.statLabel}
            statValue={formatTideTokens(metrics.buyback.tideTokens)}
            statSubValue={
              metrics.buyback.usd > 0
                ? formatUSD(metrics.buyback.usd, { compact: false })
                : undefined
            }
            footer={copy.steps.buybacks.footer}
          />

          <StepArrow />

          <TideFlywheelStepCard
            icon={<ShieldCheckIcon className="h-5 w-5" />}
            title={copy.steps.treasury.title}
            description={copy.steps.treasury.description}
            statLabel={copy.steps.treasury.statLabel}
            statValue={treasuryDisplay}
            footer={
              metrics.tideTokenConfigured
                ? copy.steps.treasury.targetLabel
                : undefined
            }
            pendingFootnote={
              !metrics.tideTokenConfigured
                ? copy.steps.treasury.pendingConfig
                : undefined
            }
            isActive={metrics.activeStage === "treasury"}
            progressPct={
              metrics.tideTokenConfigured ? metrics.treasury.ownershipPct : null
            }
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
            statValue={polDisplay}
            footer={
              metrics.polLpConfigured ? copy.steps.pol.targetLabel : undefined
            }
            pendingFootnote={
              !metrics.polLpConfigured ? copy.steps.pol.pendingConfig : undefined
            }
            isActive={metrics.activeStage === "pol"}
            progressPct={
              metrics.polLpConfigured ? metrics.pol.ownershipPct : null
            }
            progressTargetPct={metrics.pol.targetPct}
          />

          <StepArrow />

          <TideFlywheelStepCard
            icon={<FireIcon className="h-5 w-5" />}
            title={copy.steps.burn.title}
            description={copy.steps.burn.description}
            statLabel={copy.steps.burn.statLabel}
            statValue={burnDisplay}
            footer={
              metrics.tideTokenConfigured
                ? copy.steps.burn.footer
                : undefined
            }
            pendingFootnote={
              !metrics.tideTokenConfigured
                ? copy.steps.burn.pendingConfig
                : undefined
            }
            isActive={metrics.activeStage === "burn"}
          />
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
