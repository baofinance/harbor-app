import type { FounderMetricRow } from "@/hooks/useFounderMetrics";
import type { DashboardPositionRow } from "@/hooks/useDashboardPositions";
import { markets } from "@/config/markets";
import { formatUSD } from "@/utils/formatters";
import {
  ALLOCATION_BAR_ARCHIVED,
  ALLOCATION_BAR_EARN,
  ALLOCATION_BAR_SAIL,
  ALLOCATION_LEGEND_DOT_ARCHIVED,
  ALLOCATION_LEGEND_DOT_EARN,
  ALLOCATION_LEGEND_DOT_SAIL,
} from "../dashboardBrand";
import type { DashboardProductSummaryMetric } from "../DashboardProductCard";
import type { DashboardProductId } from "../dashboardProductMeta";

export type DashboardSectionSummarySegment = {
  text: string;
  tone?: "default" | "gold" | "coral" | "mint" | "muted";
};

function findMetric(
  metrics: DashboardProductSummaryMetric[],
  label: string,
): DashboardProductSummaryMetric | undefined {
  return metrics.find((m) => m.label === label);
}

function loadingOrDash(value: string): string {
  return value;
}

export function toSectionSummarySegments(
  productId: DashboardProductId,
  metrics: DashboardProductSummaryMetric[],
): DashboardSectionSummarySegment[] {
  if (metrics.length === 0) return [];

  const summaryOnly = metrics.length === 1 && metrics[0]?.label === "Summary";
  if (summaryOnly) {
    return [{ text: metrics[0]!.value, tone: "muted" }];
  }

  const loadingOnly = metrics.length === 1 && metrics[0]?.label === "Loading";
  if (loadingOnly) {
    return [{ text: "…", tone: "muted" }];
  }

  switch (productId) {
    case "yield": {
      const markets = findMetric(metrics, "Markets");
      const earned = findMetric(metrics, "Earned");
      const pending = findMetric(metrics, "Pending");
      const segments: DashboardSectionSummarySegment[] = [];
      if (markets) {
        segments.push({ text: loadingOrDash(markets.value) });
      }
      if (earned) {
        segments.push({
          text:
            earned.value === "…" ? "…" : `Earned ${earned.value}`,
          tone: earned.value !== "…" && earned.value !== "$0.00" ? "gold" : "default",
        });
      }
      if (pending) {
        segments.push({
          text:
            pending.value === "…" ? "…" : `Pending ${pending.value}`,
          tone: "coral",
        });
      }
      return segments;
    }
    case "earn": {
      const positions = findMetric(metrics, "Positions");
      const value = findMetric(metrics, "Value");
      const earned = findMetric(metrics, "Earned");
      const segments: DashboardSectionSummarySegment[] = [];
      if (positions) {
        segments.push({ text: loadingOrDash(positions.value) });
      }
      if (value) {
        segments.push({
          text: value.value === "…" ? "…" : `Value ${value.value}`,
        });
      }
      if (earned) {
        segments.push({
          text: earned.value === "…" ? "…" : `Earned ${earned.value}`,
          tone: earned.value !== "…" && earned.value !== "$0.00" ? "mint" : "default",
        });
      }
      return segments;
    }
    case "maiden":
    case "sail":
    case "archived": {
      const positions = findMetric(metrics, "Positions");
      const value = findMetric(metrics, "Value");
      const segments: DashboardSectionSummarySegment[] = [];
      if (positions) {
        segments.push({ text: loadingOrDash(positions.value) });
      }
      if (value) {
        segments.push({
          text: value.value === "…" ? "…" : `Value ${value.value}`,
        });
      }
      return segments;
    }
    default:
      return metrics.map((m) => ({
        text: m.value === "…" ? "…" : `${m.label} ${m.value}`,
      }));
  }
}

export type PortfolioAllocationSlice = {
  id: string;
  label: string;
  usd: number;
  pct: number;
  accentClass: string;
  barClass: string;
  dotClass: string;
};

export type PortfolioInsight = {
  id: string;
  label: string;
  value: string;
  subvalue?: string;
};

const ALLOCATION_COLORS = {
  maiden: {
    accent: "text-harbor-coral",
    bar: "bg-harbor-coral",
    dot: "bg-harbor-coral",
  },
  earn: {
    accent: "text-harbor-mint",
    bar: ALLOCATION_BAR_EARN,
    dot: ALLOCATION_LEGEND_DOT_EARN,
  },
  sail: {
    accent: "text-harbor-purple",
    bar: ALLOCATION_BAR_SAIL,
    dot: ALLOCATION_LEGEND_DOT_SAIL,
  },
  archived: {
    accent: "text-white/70",
    bar: ALLOCATION_BAR_ARCHIVED,
    dot: ALLOCATION_LEGEND_DOT_ARCHIVED,
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
    dotClass: e.dot,
  }));
}

/** Dashboard earned/pending USD — always show small positive values (e.g. $0.06). */
export function formatDashboardEarnedUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd > 0 && usd < 0.01) return `$${usd.toFixed(2)}`;
  return formatUSD(usd, { compact: false });
}

function formatSummaryUsd(usd: number): string {
  return formatUSD(usd, { compact: false });
}

function formatSummaryEarnedUsd(usd: number): string {
  return formatDashboardEarnedUsd(usd);
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
      value: input.loading ? "…" : formatSummaryEarnedUsd(input.earnedUsd),
      context: "Distributed",
    },
  ];

  if (input.pendingDistributionUsd > 0) {
    metrics.push({
      label: "Pending",
      value: input.loading ? "…" : formatSummaryEarnedUsd(input.pendingDistributionUsd),
      context: "Owed to you",
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
      value: input.loading || earnedLoading ? "…" : formatSummaryEarnedUsd(input.earnedUsd),
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
  BTC: { accent: "text-harbor-gold", bar: "bg-harbor-gold" },
  ETH: { accent: "text-harbor-purple", bar: "bg-harbor-purple" },
  EUR: { accent: "text-harbor-mint", bar: "bg-harbor-mint" },
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

/** Compact badge copy — replaces the subtitle under the market title. */
export function dashboardPositionStatusLabel(
  row: Pick<DashboardPositionRow, "category" | "detail" | "statusTone">,
): string {
  const { positionType, positionSubtype } = parsePositionDetail(row.detail);

  if (row.category === "maiden_voyage") {
    return row.statusTone === "ended" ? "Maiden voyage ended" : "Maiden voyage active";
  }

  if (row.category === "earn") {
    if (positionSubtype === "wallet") return "Earn wallet";
    if (positionSubtype === "stability") {
      return positionType === "Sail pool"
        ? "Sail stability pool"
        : "Earn stability pool";
    }
  }

  if (row.category === "leverage") {
    if (positionSubtype === "marks") return "Sail marks";
    if (positionSubtype === "position") return "Sail position";
  }

  return positionSubtype ?? positionType;
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

export function positionValueContext(
  row: Pick<DashboardPositionRow, "category" | "statusTone">,
): string | undefined {
  if (row.category === "maiden_voyage" && row.statusTone === "ended") {
    return "At voyage end";
  }
  return undefined;
}

/** PnL text + dark inset color classes (matches sail page sign/format). */
export function formatDashboardPnL(value: number): { text: string; className: string } {
  const isPositive = value >= 0;
  const sign = isPositive ? "+" : "-";
  const text = `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const className = isPositive
    ? "font-mono text-[11px] tabular-nums text-harbor-mint"
    : "font-mono text-[11px] tabular-nums text-harbor-coral";
  return { text, className };
}

export function formatDashboardPnLPercent(percent: number): string {
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}
