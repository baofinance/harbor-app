import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";

export type PortfolioAllocationSlice = {
  id: string;
  label: string;
  usd: number;
  pct: number;
  accentClass: string;
  barClass: string;
};

export type PortfolioInsight = {
  id: string;
  label: string;
  value: string;
  subvalue?: string;
};

const ALLOCATION_COLORS = {
  maiden: {
    accent: "text-[#FF8A7A]",
    bar: "bg-[#FF8A7A]",
  },
  earn: {
    accent: "text-[#B8EBD5]",
    bar: "bg-[#B8EBD5]",
  },
  sail: {
    accent: "text-[#C4B5FD]",
    bar: "bg-[#C4B5FD]",
  },
  archived: {
    accent: "text-white/70",
    bar: "bg-white/50",
  },
} as const;

export function buildPortfolioAllocation(input: {
  maidenUsd: number;
  earnUsd: number;
  sailUsd: number;
  archivedUsd: number;
}): PortfolioAllocationSlice[] {
  const entries = [
    { id: "maiden", label: "Maiden Voyage", usd: input.maidenUsd, ...ALLOCATION_COLORS.maiden },
    { id: "earn", label: "Earn", usd: input.earnUsd, ...ALLOCATION_COLORS.earn },
    { id: "sail", label: "Sail", usd: input.sailUsd, ...ALLOCATION_COLORS.sail },
    { id: "archived", label: "Archived", usd: input.archivedUsd, ...ALLOCATION_COLORS.archived },
  ].filter((e) => e.usd > 0);

  const total = entries.reduce((s, e) => s + e.usd, 0);
  if (total <= 0) return [];

  return entries.map((e) => ({
    id: e.id,
    label: e.label,
    usd: e.usd,
    pct: (e.usd / total) * 100,
    accentClass: e.accent,
    barClass: e.bar,
  }));
}

export function buildPortfolioInsights(
  positionRows: DashboardPositionRow[],
  yieldRows: FounderMetricRow[],
): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];

  if (positionRows.length > 0) {
    const largest = [...positionRows].sort((a, b) => b.usd - a.usd)[0]!;
    insights.push({
      id: "largest",
      label: "Largest position",
      value: formatMarketLabel(largest.marketLabel),
      subvalue: largest.usd > 0 ? formatUsdShort(largest.usd) : undefined,
    });
  }

  if (yieldRows.length > 0) {
    const topEarner = [...yieldRows].sort(
      (a, b) => b.totalEarnedUSD - a.totalEarnedUSD,
    )[0]!;
    if (topEarner.totalEarnedUSD > 0) {
      insights.push({
        id: "earner",
        label: "Highest earner",
        value: topEarner.marketName,
        subvalue: formatUsdShort(topEarner.totalEarnedUSD),
      });
    }
  }

  const marketCounts = new Map<string, { label: string; count: number }>();
  for (const row of positionRows) {
    const key = row.marketId ?? row.marketLabel;
    const existing = marketCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      marketCounts.set(key, { label: formatMarketLabel(row.marketLabel), count: 1 });
    }
  }
  const mostActive = [...marketCounts.values()].sort((a, b) => b.count - a.count)[0];
  if (mostActive && mostActive.count > 1) {
    insights.push({
      id: "active",
      label: "Most active market",
      value: mostActive.label,
      subvalue: `${mostActive.count} positions`,
    });
  } else if (mostActive && positionRows.length > 0) {
    insights.push({
      id: "active",
      label: "Primary market",
      value: mostActive.label,
    });
  }

  return insights.slice(0, 3);
}

export function aggregateYieldShareSummary(rows: FounderMetricRow[]) {
  const revenueEarned = rows.reduce((s, r) => s + r.totalEarnedUSD, 0);
  const revenueSharePct = rows.reduce((s, r) => s + r.yieldSharePct, 0);
  const boostMultiplier = rows.reduce((max, r) => {
    const m = r.boostMultiplier ?? 0;
    return m > max ? m : max;
  }, 0);

  return {
    revenueEarned,
    revenueSharePct,
    boostMultiplier: boostMultiplier > 0 ? boostMultiplier : null,
    marketCount: rows.length,
  };
}

export function parsePositionDetail(detail: string): {
  positionType: string;
  positionSubtype?: string;
} {
  const parts = detail.split("·").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { positionType: parts[0]!, positionSubtype: parts[1] };
  }
  return { positionType: detail };
}

export function formatMarketLabel(label: string): string {
  return label.replace(/\s*-\s*/g, " / ");
}

function formatUsdShort(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

export function positionValueLabel(category: DashboardPositionRow["category"]): string {
  switch (category) {
    case "maiden_voyage":
      return "Deposited";
    case "earn":
      return "Balance";
    case "leverage":
      return "Position";
    default:
      return "Value";
  }
}
