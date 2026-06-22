import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { markets } from "@/config/markets";
import { formatUSD } from "@/utils/formatters";
import type { DashboardProductSummaryMetric } from "../DashboardProductCard";

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
  const pendingDistributionUsd = rows.reduce((s, r) => s + r.outstandingUSD, 0);
  const boostMultiplier = rows.reduce((max, r) => {
    const m = r.boostMultiplier ?? 0;
    return m > max ? m : max;
  }, 0);

  return {
    revenueEarned,
    revenueSharePct,
    pendingDistributionUsd,
    boostMultiplier: boostMultiplier > 0 ? boostMultiplier : null,
    marketCount: rows.length,
  };
}

function formatSummaryUsd(usd: number): string {
  return formatUSD(usd, { compact: false });
}

function positionCountLabel(count: number): string {
  if (count === 1) return "1 position";
  return `${count} positions`;
}

function marketCountLabel(count: number): string {
  if (count === 1) return "1 market";
  return `${count} markets`;
}

function disconnectedMetrics(
  labels: string[],
): DashboardProductSummaryMetric[] {
  return labels.map((label) => ({ label, value: "—" }));
}

export function buildRevenueShareSummaryMetrics(input: {
  isConnected: boolean;
  loading: boolean;
  marketCount: number;
  earnedUsd: number;
  pendingDistributionUsd: number;
}): DashboardProductSummaryMetric[] {
  if (!input.isConnected) {
    return disconnectedMetrics(["Markets", "Earned"]);
  }

  const metrics: DashboardProductSummaryMetric[] = [
    {
      label: "Markets",
      value: input.loading ? "…" : marketCountLabel(input.marketCount),
    },
    {
      label: "Earned",
      value: input.loading ? "…" : formatSummaryUsd(input.earnedUsd),
    },
  ];

  if (input.pendingDistributionUsd > 0) {
    metrics.push({
      label: "Pending distribution",
      value: input.loading ? "…" : formatSummaryUsd(input.pendingDistributionUsd),
    });
  }

  return metrics;
}

export function buildEarnSummaryMetrics(input: {
  isConnected: boolean;
  loading: boolean;
  valueUsd: number;
  positionCount: number;
  earnedUsd: number;
  earnedLoading?: boolean;
}): DashboardProductSummaryMetric[] {
  if (!input.isConnected) {
    return disconnectedMetrics(["Value", "Positions", "Earned"]);
  }

  const earnedLoading = input.earnedLoading ?? false;

  return [
    {
      label: "Value",
      value: input.loading ? "…" : formatSummaryUsd(input.valueUsd),
    },
    {
      label: "Positions",
      value: input.loading ? "…" : positionCountLabel(input.positionCount),
    },
    {
      label: "Earned",
      value: input.loading || earnedLoading ? "…" : formatSummaryUsd(input.earnedUsd),
    },
  ];
}

export function buildPositionSummaryMetrics(input: {
  isConnected: boolean;
  loading: boolean;
  valueUsd: number;
  positionCount: number;
}): DashboardProductSummaryMetric[] {
  if (!input.isConnected) {
    return disconnectedMetrics(["Value", "Positions"]);
  }

  return [
    {
      label: "Value",
      value: input.loading ? "…" : formatSummaryUsd(input.valueUsd),
    },
    {
      label: "Positions",
      value: input.loading ? "…" : positionCountLabel(input.positionCount),
    },
  ];
}

export type PortfolioInsightLine = {
  id: string;
  label: string;
  value: string;
};

export type MarketCompositionSlice = {
  id: string;
  label: string;
  usd: number;
  pct: number;
  accentClass: string;
  barClass: string;
};

const MARKET_COMPOSITION_COLORS = {
  BTC: { accent: "text-[#F5D76E]", bar: "bg-[#F5D76E]" },
  ETH: { accent: "text-[#C4B5FD]", bar: "bg-[#C4B5FD]" },
  EUR: { accent: "text-[#B8EBD5]", bar: "bg-[#B8EBD5]" },
} as const;

function pegBucketFromMarketId(marketId?: string): keyof typeof MARKET_COMPOSITION_COLORS | null {
  if (!marketId) return null;
  const m = (markets as Record<string, { pegTarget?: string }>)[marketId];
  const peg = m?.pegTarget?.toUpperCase();
  if (peg === "BTC") return "BTC";
  if (peg === "ETH") return "ETH";
  if (peg === "EUR" || peg === "EURO") return "EUR";
  const id = marketId.toLowerCase();
  if (id.startsWith("btc-")) return "BTC";
  if (id.startsWith("eth-")) return "ETH";
  if (id.includes("eur")) return "EUR";
  return null;
}

export function buildMarketComposition(
  rows: DashboardPositionRow[],
): MarketCompositionSlice[] | null {
  const buckets = new Map<keyof typeof MARKET_COMPOSITION_COLORS, number>();

  for (const row of rows) {
    if (row.usd <= 0) continue;
    const bucket = pegBucketFromMarketId(row.marketId);
    if (!bucket) continue;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + row.usd);
  }

  if (buckets.size < 2) return null;

  const total = [...buckets.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) return null;

  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, usd]) => ({
      id: id.toLowerCase(),
      label: `${id} Markets`,
      usd,
      pct: (usd / total) * 100,
      accentClass: MARKET_COMPOSITION_COLORS[id].accent,
      barClass: MARKET_COMPOSITION_COLORS[id].bar,
    }));
}

export function buildPortfolioInsightLines(input: {
  allPositionRows: DashboardPositionRow[];
  categoryCounts: {
    earn: number;
    sail: number;
    maiden: number;
    archived: number;
  };
  marksDeposits: Array<{ label: string; usd: number; timestamp: number }>;
}): PortfolioInsightLine[] {
  const lines: PortfolioInsightLine[] = [];

  const pricedRows = input.allPositionRows.filter((r) => r.usd > 0);
  if (pricedRows.length > 0) {
    const largest = [...pricedRows].sort((a, b) => b.usd - a.usd)[0]!;
    lines.push({
      id: "largest",
      label: "Largest position",
      value: `${formatMarketLabel(largest.marketLabel)} · ${formatUsdShort(largest.usd)}`,
    });
  }

  const categories = [
    { id: "earn", label: "Earn", count: input.categoryCounts.earn },
    { id: "sail", label: "Sail", count: input.categoryCounts.sail },
    { id: "maiden", label: "Maiden Voyage", count: input.categoryCounts.maiden },
    { id: "archived", label: "Archived", count: input.categoryCounts.archived },
  ].filter((c) => c.count > 0);

  if (categories.length > 0) {
    const top = [...categories].sort((a, b) => b.count - a.count)[0]!;
    lines.push({
      id: "most-positions",
      label: "Most positions",
      value: `${top.label} (${top.count})`,
    });
  }

  if (input.marksDeposits.length > 0) {
    const sorted = [...input.marksDeposits].sort((a, b) => a.timestamp - b.timestamp);
    const newest = sorted[sorted.length - 1]!;
    const oldest = sorted[0]!;
    lines.push({
      id: "newest",
      label: "Newest position",
      value: formatMarketLabel(newest.label),
    });
    if (sorted.length > 1 && oldest.timestamp !== newest.timestamp) {
      lines.push({
        id: "oldest",
        label: "Oldest position",
        value: formatMarketLabel(oldest.label),
      });
    }
  }

  return lines;
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
