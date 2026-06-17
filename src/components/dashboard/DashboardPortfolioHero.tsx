"use client";

import { MV_PRIMARY_CTA, MV_SECTION_LABEL } from "@/components/genesis/maidenVoyageLayoutStyles";
import { formatUSD } from "@/utils/formatters";
import {
  DASHBOARD_PORTFOLIO_HERO_CLASS,
  DASHBOARD_PORTFOLIO_HERO_METRIC_CLASS,
  DASHBOARD_PORTFOLIO_HERO_METRIC_VALUE_CLASS,
  DASHBOARD_PORTFOLIO_HERO_TITLE_CLASS,
} from "./dashboardStyles";

export type DashboardPortfolioHeroProps = {
  totalPositionValue: number;
  totalEarned: number;
  uncollected: number;
  isConnected: boolean;
  isLoading?: boolean;
  onClaimRewards?: () => void;
};

function HeroMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={DASHBOARD_PORTFOLIO_HERO_METRIC_CLASS}>
      <p className={MV_SECTION_LABEL}>{label}</p>
      <p
        className={`${DASHBOARD_PORTFOLIO_HERO_METRIC_VALUE_CLASS} ${
          highlight ? "text-[#FF8A7A]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function DashboardPortfolioHero({
  totalPositionValue,
  totalEarned,
  uncollected,
  isConnected,
  isLoading = false,
  onClaimRewards,
}: DashboardPortfolioHeroProps) {
  const canClaim = isConnected && uncollected > 0.005;
  const valueDisplay = !isConnected
    ? "—"
    : isLoading
      ? "…"
      : formatUSD(totalPositionValue, { compact: false });
  const earnedDisplay = !isConnected
    ? "—"
    : isLoading
      ? "…"
      : formatUSD(totalEarned, { compact: false });
  const uncollectedDisplay = !isConnected
    ? "—"
    : isLoading
      ? "…"
      : formatUSD(uncollected, { compact: false });

  return (
    <section className={DASHBOARD_PORTFOLIO_HERO_CLASS} aria-label="Portfolio overview">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-4">
          <h2 className={DASHBOARD_PORTFOLIO_HERO_TITLE_CLASS}>Portfolio overview</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            <HeroMetric label="Total position value" value={valueDisplay} />
            <HeroMetric label="Total earned" value={earnedDisplay} />
            <HeroMetric
              label="Uncollected"
              value={uncollectedDisplay}
              highlight={uncollected > 0.005}
            />
          </div>
        </div>
        {canClaim && onClaimRewards ? (
          <button type="button" className={MV_PRIMARY_CTA} onClick={onClaimRewards}>
            Claim rewards
          </button>
        ) : null}
      </div>
    </section>
  );
}
