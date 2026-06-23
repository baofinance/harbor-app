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

export type Achievement = {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
  detail?: string;
};

export type TimelineEventKind = "deposit" | "revenue" | "voyage" | "archived";

export type TimelineEventValueTone = "positive" | "muted";

export type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  timestamp: number;
  relativeLabel: string;
  kind: TimelineEventKind;
  valueLabel?: string | null;
  valueTone?: TimelineEventValueTone;
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
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
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

function genesisMarketName(
  genesis: string,
  yieldRows: FounderMetricRow[],
): string | null {
  const row = yieldRows.find(
    (r) => r.genesis.toLowerCase() === genesis.toLowerCase(),
  );
  return row ? formatMarketLabel(row.marketName) : null;
}

export function buildTimelineEvents(
  input: DashboardEngagementInput,
  marksDeposits: Array<{ label: string; usd: number; timestamp: number }>,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const completedMarkets = new Set<string>();

  for (const e of input.yieldEvents) {
    const ts = new Date(e.createdAt).getTime();
    const marketName = genesisMarketName(e.genesis, input.yieldRows);
    const amount = formatUsdShort(parseUsd(e.amountUSD));
    events.push({
      id: `yield-${e.createdAt}-${e.amountUSD}-${e.genesis}`,
      label: "Revenue distribution received",
      detail: marketName ?? "",
      timestamp: ts,
      relativeLabel: relativeTime(ts),
      kind: "revenue",
      valueLabel: amount,
      valueTone: "positive",
    });
  }

  for (const d of marksDeposits) {
    const ts = d.timestamp * 1000;
    const marketLabel = formatMarketLabel(d.label);
    events.push({
      id: `deposit-${d.timestamp}-${d.label}`,
      label: `Deposited into ${marketLabel}`,
      detail: "",
      timestamp: ts,
      relativeLabel: relativeTime(ts),
      kind: "deposit",
      valueLabel: formatUsdShort(d.usd),
      valueTone: "positive",
    });
  }

  for (const m of input.marksParticipation) {
    if (!m.genesisEnded) continue;
    completedMarkets.add(m.marketLabel.toLowerCase());
    const depositTs = marksDeposits
      .filter((d) => d.label.toLowerCase() === m.marketLabel.toLowerCase())
      .map((d) => d.timestamp * 1000);
    const ts =
      depositTs.length > 0
        ? Math.max(...depositTs)
        : m.genesisStartDate != null
          ? m.genesisStartDate * 1000
          : 0;

    events.push({
      id: `voyage-complete-${m.genesisAddress}`,
      label: "Maiden voyage completed",
      detail: formatMarketLabel(m.marketLabel),
      timestamp: ts,
      relativeLabel: ts > 0 ? relativeTime(ts) : "Completed",
      kind: "voyage",
      valueLabel: null,
      valueTone: "muted",
    });
  }

  for (const row of input.archivedRows) {
    const key = row.marketLabel.toLowerCase();
    if (completedMarkets.has(key)) continue;
    events.push({
      id: `archived-${row.id}`,
      label: "Position archived",
      detail: formatMarketLabel(row.marketLabel),
      timestamp: 0,
      relativeLabel: "Archived",
      kind: "archived",
      valueLabel: null,
      valueTone: "muted",
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
