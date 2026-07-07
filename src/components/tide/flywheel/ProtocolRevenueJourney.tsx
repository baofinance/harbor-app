"use client";

import { useMemo } from "react";
import {
  FireIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import { Droplets } from "lucide-react";
import { TIDE_FLYWHEEL_CONFIG } from "@/config/tideFlywheel";
import { useTideFlywheelMetrics } from "@/hooks/useTideFlywheelMetrics";
import { formatUSD } from "@/utils/formatters";
import {
  deriveAllStageVisuals,
  progressTowardTarget,
} from "@/utils/tideRevenueJourney";
import { JourneyEducation } from "./JourneyEducation";
import { JourneyRevenueBanner } from "./JourneyRevenueBanner";
import { JourneyStageCard } from "./JourneyStageCard";
import { JourneyTimeline } from "./JourneyTimeline";
import {
  JOURNEY_CONTENT_CLASS,
  JOURNEY_FLOW_CLASS,
  JOURNEY_HEADER_TEXT_CLASS,
  JOURNEY_SECTION_CLASS,
  JOURNEY_SUBTITLE_CLASS,
  JOURNEY_TITLE_CLASS,
} from "./revenueJourneyStyles";

function formatPct(value: number | null | undefined): string {
  const n = value ?? 0;
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

function formatTideTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} TIDE`;
}

export function ProtocolRevenueJourney() {
  const metrics = useTideFlywheelMetrics();
  const copy = TIDE_FLYWHEEL_CONFIG.copy;

  const visuals = useMemo(
    () => deriveAllStageVisuals(metrics),
    [metrics],
  );

  const visualById = useMemo(
    () => Object.fromEntries(visuals.map((v) => [v.id, v.state])),
    [visuals],
  );

  const treasuryPct = metrics.treasury.ownershipPct ?? 0;
  const polPct = metrics.pol.ownershipPct ?? 0;
  const burnPct = metrics.burn.supplyBurnedPct ?? 0;
  const polPoolUrl = TIDE_FLYWHEEL_CONFIG.polV4?.uniswapPoolUrl;

  const treasuryVisual = visualById.treasury ?? "future";
  const polVisual = visualById.pol ?? "future";
  const burnVisual = visualById.burn ?? "future";

  const stages = [
    {
      id: "treasury",
      visualState: treasuryVisual,
      card: (
        <JourneyStageCard
          stageId="treasury"
          visualState={treasuryVisual}
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          title={copy.stages.treasury.title}
          description={copy.stages.treasury.description}
          statusLabel={
            metrics.treasury.targetReached
              ? copy.stages.treasury.targetReached
              : undefined
          }
          currentLabel={copy.stages.treasury.currentLabel}
          currentValue={metrics.isLoading ? "…" : formatPct(treasuryPct)}
          targetLabel={copy.stages.treasury.targetLabel}
          targetValue={`${metrics.treasury.targetPct}%`}
          progressPct={progressTowardTarget(
            metrics.treasury.ownershipPct,
            metrics.treasury.targetPct,
          )}
          progressComplete={metrics.treasury.targetReached}
        />
      ),
    },
    {
      id: "pol",
      visualState: polVisual,
      card: (
        <JourneyStageCard
          stageId="pol"
          visualState={polVisual}
          icon={<Droplets className="h-5 w-5" strokeWidth={1.75} />}
          title={copy.stages.pol.title}
          description={copy.stages.pol.description}
          currentLabel={copy.stages.pol.currentLabel}
          currentValue={
            metrics.isLoading
              ? "…"
              : metrics.polLpConfigured
                ? formatPct(polPct)
                : "—"
          }
          targetLabel={copy.stages.pol.targetLabel}
          targetValue={`${metrics.pol.targetPct}%`}
          progressPct={
            metrics.polLpConfigured
              ? progressTowardTarget(
                  metrics.pol.ownershipPct,
                  metrics.pol.targetPct,
                )
              : 0
          }
          progressComplete={metrics.pol.targetReached}
          footer={
            !metrics.polLpConfigured && !metrics.isLoading ? (
              <p className="text-[10px] text-[#1E4775]/50">
                {copy.stages.pol.pendingConfig}
              </p>
            ) : metrics.polLpConfigured && polPoolUrl ? (
              <a
                href={polPoolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-harbor-coral underline-offset-2 hover:underline"
              >
                {copy.stages.pol.viewPoolLabel}
              </a>
            ) : null
          }
        />
      ),
    },
    {
      id: "burn",
      visualState: burnVisual,
      card: (
        <JourneyStageCard
          stageId="burn"
          visualState={burnVisual}
          icon={<FireIcon className="h-5 w-5" />}
          title={copy.stages.burn.title}
          description={copy.stages.burn.description}
          metricLabel={copy.stages.burn.currentLabel}
          metricValue={metrics.isLoading ? "…" : formatPct(burnPct)}
          progressPct={
            burnVisual === "active"
              ? Math.min(100, Math.max(burnPct, 0))
              : progressTowardTarget(
                  metrics.pol.ownershipPct,
                  metrics.pol.targetPct,
                )
          }
          progressComplete={metrics.activeStage === "burn"}
        />
      ),
    },
  ];

  return (
    <section
      className={JOURNEY_SECTION_CLASS}
      aria-label={copy.sectionTitle}
    >
      <div className={JOURNEY_CONTENT_CLASS}>
        <header className={JOURNEY_HEADER_TEXT_CLASS}>
          <h2 className={JOURNEY_TITLE_CLASS}>{copy.sectionTitle}</h2>
          <p className={JOURNEY_SUBTITLE_CLASS}>{copy.sectionSubtitle}</p>
        </header>

        <div className={JOURNEY_FLOW_CLASS}>
          <JourneyRevenueBanner
            label={copy.revenueHero.label}
            tagline={copy.revenueHero.tagline}
            revenueUsd={metrics.lifetimeRevenueUsd}
            isLoading={metrics.isLoading}
            buybackTitle={copy.stages.buyback.title}
            buybackDescription={copy.stages.buyback.description}
            buybackStatLabel={copy.stages.buyback.statLabel}
            buybackTideAmount={
              metrics.isLoading
                ? "…"
                : formatTideTokens(metrics.buyback.tideTokens)
            }
            buybackUsdAmount={
              metrics.isLoading
                ? ""
                : `(${formatUSD(metrics.buyback.usd, { compact: false })})`
            }
          />

          <JourneyTimeline stages={stages} />
        </div>

        <JourneyEducation
          howRevenueFlows={copy.education.howRevenueFlows}
          whyThisMatters={copy.education.whyThisMatters}
        />
      </div>
    </section>
  );
}

/** @deprecated Use ProtocolRevenueJourney */
export const TideValueFlywheel = ProtocolRevenueJourney;
