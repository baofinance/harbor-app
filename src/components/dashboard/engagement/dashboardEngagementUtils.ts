import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import type { DashboardActiveVoyageSnapshot } from "@/hooks/useDashboardActiveVoyage";
import { formatMarketLabel } from "../portfolio/dashboardPortfolioUtils";

export type YieldDistributionEvent = {
  genesis: string;
  amountUSD: string;
  createdAt: string;
  txHash?: string;
};

export type MarksParticipation = {
  genesisAddress: string;
  marketLabel: string;
  genesisStartDate: number | null;
  genesisEnded: boolean;
  boostMultiplier: number;
  maxBoost: number;
  ownershipSharePct: number;
  currentDepositUsd: number;
};

export type DashboardEngagementInput = {
  yieldRows: FounderMetricRow[];
  yieldEvents: YieldDistributionEvent[];
  marksParticipation: MarksParticipation[];
  maidenRows: DashboardPositionRow[];
  archivedRows: DashboardPositionRow[];
  allPositionRows: DashboardPositionRow[];
  activeVoyage: DashboardActiveVoyageSnapshot | null;
  positionTotals: {
    maiden: number;
    earn: number;
    sail: number;
    archived: number;
  };
  totalEarned: number;
  totalOutstanding: number;
};

export type RevenuePeriodBucket = {
  label: string;
  usd: number;
};

export type Achievement = {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
  detail?: string;
};

export type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  timestamp: number;
  relativeLabel: string;
};

export type Opportunity = {
  id: string;
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  emphasis?: boolean;
};

export type YieldHubSnapshot = {
  revenueSharePct: number;
  boostMultiplier: number | null;
  revenueEarned: number;
  eligibleSinceDays: number | null;
  nextMilestoneLabel: string;
  milestoneProgressPct: number;
  milestoneCurrent: number;
  milestoneTarget: number;
};

export type JourneyMetrics = {
  daysActive: number | null;
  marketsJoined: number;
  revenueEarned: number;
  foundingPositions: number;
};

export type PortfolioHealth = {
  status: "strong" | "attention" | "empty";
  statusLabel: string;
  averageProtectionPct: number | null;
  activePositions: number;
  message: string;
};

const DAY_MS = 86_400_000;

function parseUsd(value: string | number): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function relativeTime(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const days = Math.floor(diff / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function buildRevenuePeriods(
  events: YieldDistributionEvent[],
  totalEarned: number,
): RevenuePeriodBucket[] {
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();
  const weekStart = dayStart - 6 * DAY_MS;
  const monthStart = dayStart - 29 * DAY_MS;

  let today = 0;
  let week = 0;
  let month = 0;

  for (const e of events) {
    const ts = new Date(e.createdAt).getTime();
    const usd = parseUsd(e.amountUSD);
    if (ts >= dayStart) today += usd;
    if (ts >= weekStart) week += usd;
    if (ts >= monthStart) month += usd;
  }

  return [
    { label: "Today", usd: today },
    { label: "This week", usd: week },
    { label: "This month", usd: month },
    { label: "All time", usd: totalEarned },
  ];
}

export function buildRevenueSparkline(
  events: YieldDistributionEvent[],
  days = 14,
): number[] {
  const now = Date.now();
  const buckets = Array.from({ length: days }, () => 0);
  for (const e of events) {
    const ts = new Date(e.createdAt).getTime();
    const dayIndex = Math.floor((now - ts) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < days) {
      buckets[days - 1 - dayIndex] += parseUsd(e.amountUSD);
    }
  }
  let cumulative = 0;
  return buckets.map((v) => {
    cumulative += v;
    return cumulative;
  });
}

export function buildYieldHubSnapshot(
  input: DashboardEngagementInput,
): YieldHubSnapshot {
  const revenueSharePct = input.yieldRows.reduce((s, r) => s + r.yieldSharePct, 0);
  const boostMultiplier = input.yieldRows.reduce((max, r) => {
    const m = r.boostMultiplier ?? 0;
    return m > max ? m : max;
  }, 0);

  const startDates = input.marksParticipation
    .map((m) => m.genesisStartDate)
    .filter((d): d is number => d != null && d > 0);
  const earliest = startDates.length ? Math.min(...startDates) : null;
  const eligibleSinceDays =
    earliest != null
      ? Math.max(0, Math.floor((Date.now() - earliest * 1000) / DAY_MS))
      : null;

  let nextMilestoneLabel = "30 day boost";
  let milestoneTarget = 30;
  if (eligibleSinceDays != null && eligibleSinceDays >= 30) {
    nextMilestoneLabel = "90 day boost";
    milestoneTarget = 90;
  }
  const milestoneCurrent = eligibleSinceDays ?? 0;
  const milestoneProgressPct = Math.min(
    100,
    milestoneTarget > 0 ? (milestoneCurrent / milestoneTarget) * 100 : 0,
  );

  return {
    revenueSharePct,
    boostMultiplier: boostMultiplier > 0 ? boostMultiplier : null,
    revenueEarned: input.totalEarned,
    eligibleSinceDays,
    nextMilestoneLabel,
    milestoneProgressPct,
    milestoneCurrent,
    milestoneTarget,
  };
}

export function buildFoundingMarkets(input: DashboardEngagementInput) {
  const byMarket = new Map<
    string,
    { label: string; status: "active" | "completed"; usd: number }
  >();

  for (const row of input.maidenRows) {
    const key = row.marketId ?? row.marketLabel;
    byMarket.set(key, {
      label: formatMarketLabel(row.marketLabel),
      status: row.statusTone === "ended" ? "completed" : "active",
      usd: row.usd,
    });
  }
  for (const row of input.archivedRows) {
    const key = row.marketId ?? row.marketLabel;
    byMarket.set(key, {
      label: formatMarketLabel(row.marketLabel),
      status: "completed",
      usd: row.usd,
    });
  }

  for (const m of input.marksParticipation) {
    if (m.ownershipSharePct <= 0 && m.currentDepositUsd <= 0) continue;
    const key = m.genesisAddress;
    if (!byMarket.has(key)) {
      byMarket.set(key, {
        label: m.marketLabel,
        status: m.genesisEnded ? "completed" : "active",
        usd: m.currentDepositUsd,
      });
    }
  }

  const markets = [...byMarket.values()];
  return {
    joined: markets.length,
    active: markets.filter((m) => m.status === "active").length,
    completed: markets.filter((m) => m.status === "completed").length,
    markets,
  };
}

export function buildAchievements(input: DashboardEngagementInput): Achievement[] {
  const founding = buildFoundingMarkets(input);
  const hub = buildYieldHubSnapshot(input);

  return [
    {
      id: "first_voyage",
      icon: "⚓",
      label: "First voyage joined",
      earned: founding.joined > 0,
    },
    {
      id: "first_revenue",
      icon: "🌊",
      label: "Earned first revenue",
      earned: input.totalEarned > 0.005,
    },
    {
      id: "founding_member",
      icon: "🏛",
      label: "Founding member",
      earned: input.marksParticipation.some((m) => m.ownershipSharePct > 0),
    },
    {
      id: "five_voyages",
      icon: "🚀",
      label: "Joined 5 voyages",
      earned: founding.joined >= 5,
      detail: `${founding.joined}/5`,
    },
    {
      id: "full_eligibility",
      icon: "💎",
      label: "Maintained full eligibility for 90 days",
      earned: (hub.eligibleSinceDays ?? 0) >= 90,
      detail: hub.eligibleSinceDays != null ? `${hub.eligibleSinceDays} days` : undefined,
    },
  ];
}

export function buildTimelineEvents(
  input: DashboardEngagementInput,
  marksDeposits: Array<{ label: string; usd: number; timestamp: number }>,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const e of input.yieldEvents) {
    const ts = new Date(e.createdAt).getTime();
    events.push({
      id: `yield-${e.createdAt}-${e.amountUSD}`,
      label: "Revenue received",
      detail: `$${parseUsd(e.amountUSD).toFixed(2)}`,
      timestamp: ts,
      relativeLabel: relativeTime(ts),
    });
  }

  for (const d of marksDeposits) {
    events.push({
      id: `deposit-${d.timestamp}-${d.label}`,
      label: "Deposited into voyage",
      detail: `${d.label} · $${d.usd.toFixed(2)}`,
      timestamp: d.timestamp * 1000,
      relativeLabel: relativeTime(d.timestamp * 1000),
    });
  }

  if (input.activeVoyage?.filledPct != null && input.activeVoyage.filledPct >= 99) {
    events.push({
      id: "voyage-capacity",
      label: "Voyage reached capacity",
      detail: input.activeVoyage.voyageLabel,
      timestamp: Date.now() - 3 * DAY_MS,
      relativeLabel: "Recently",
    });
  }

  return events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);
}

export function buildJourneyMetrics(input: DashboardEngagementInput): JourneyMetrics {
  const founding = buildFoundingMarkets(input);
  const startDates = input.marksParticipation
    .map((m) => m.genesisStartDate)
    .filter((d): d is number => d != null && d > 0);
  const earliest = startDates.length ? Math.min(...startDates) : null;

  return {
    daysActive:
      earliest != null
        ? Math.max(1, Math.floor((Date.now() - earliest * 1000) / DAY_MS))
        : null,
    marketsJoined: founding.joined,
    revenueEarned: input.totalEarned,
    foundingPositions: founding.joined,
  };
}

export function buildPortfolioHealth(input: DashboardEngagementInput): PortfolioHealth {
  const activePositions = input.allPositionRows.length;
  if (activePositions === 0) {
    return {
      status: "empty",
      statusLabel: "Getting started",
      averageProtectionPct: null,
      activePositions: 0,
      message: "No positions currently requiring attention.",
    };
  }

  const boosts = input.marksParticipation
    .filter((m) => m.boostMultiplier > 0 && m.maxBoost > 0)
    .map((m) => (m.boostMultiplier / m.maxBoost) * 100);

  const avgProtection =
    boosts.length > 0 ? boosts.reduce((s, b) => s + b, 0) / boosts.length : null;

  const needsAttention = input.totalOutstanding > 0.05 || (avgProtection != null && avgProtection < 70);

  return {
    status: needsAttention ? "attention" : "strong",
    statusLabel: needsAttention ? "Review suggested" : "Strong",
    averageProtectionPct: avgProtection,
    activePositions,
    message: needsAttention
      ? "Some positions may benefit from a quick review."
      : "Your portfolio looks healthy.",
  };
}

export function buildOpportunities(
  input: DashboardEngagementInput,
  handlers: { onClaim?: () => void; onYieldDetails?: () => void },
): Opportunity[] {
  const ops: Opportunity[] = [];

  if (input.activeVoyage?.status === "deposits_open") {
    ops.push({
      id: "new_voyage",
      icon: "⚓",
      label: `New maiden voyage open · ${input.activeVoyage.flowLabel}`,
      href: "/genesis",
      emphasis: true,
    });
  }

  if (input.totalOutstanding > 0.005) {
    ops.push({
      id: "claim",
      icon: "💰",
      label: `Claim ${formatUsdShort(input.totalOutstanding)} revenue`,
      onClick: handlers.onClaim,
      emphasis: true,
    });
  }

  if (input.yieldRows.length > 0) {
    ops.push({
      id: "yield",
      icon: "🌊",
      label: "Review yield share details",
      onClick: handlers.onYieldDetails,
    });
  }

  const topEarn = [...input.allPositionRows].sort((a, b) => b.usd - a.usd)[0];
  if (topEarn && topEarn.category === "earn") {
    ops.push({
      id: "earn_pool",
      icon: "📈",
      label: `Add to ${formatMarketLabel(topEarn.marketLabel)} stability pool`,
      href: "/anchor",
    });
  }

  return ops.slice(0, 4);
}

function formatUsdShort(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

export function buildWelcomeHighlights(input: DashboardEngagementInput) {
  const hub = buildYieldHubSnapshot(input);
  const health = buildPortfolioHealth(input);

  return {
    earnedLabel: formatUsdShort(input.totalEarned),
    boostLabel: hub.boostMultiplier != null ? `${hub.boostMultiplier}×` : null,
    voyageOpen: input.activeVoyage?.status === "deposits_open",
    voyageLabel: input.activeVoyage?.flowLabel ?? null,
    milestoneDaysLeft:
      hub.eligibleSinceDays != null && hub.milestoneTarget > hub.milestoneCurrent
        ? hub.milestoneTarget - hub.milestoneCurrent
        : null,
    nextMilestoneLabel: hub.nextMilestoneLabel,
    healthLabel: health.statusLabel,
  };
}

export type WelcomeHighlights = ReturnType<typeof buildWelcomeHighlights>;
