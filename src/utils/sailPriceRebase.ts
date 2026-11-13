import type {
  SailPerpBenchmarkResult,
  SailStateObservation,
} from "@/utils/sailPerpBenchmark";

/**
 * Sail-side book before the incident and after the recap.
 * Subgraph hourly rows store supply as 0, so the chart cannot do price × supply
 * itself. From the recap onward the unit price is scaled onto the pre-incident
 * share count: (priceNow × supplyNow) / supplyBefore.
 *
 * 15 Oct 2026, block 26,199,194, before the collateral drop:
 *   10,762.406044992895 hs at 0.826780103227 haEUR ≈ 4.11 wstETH on the sail side.
 * 13 Nov 2026, block 26,407,867, after the correction mint:
 *   97,769.68869678853 hs at 0.0396318876395 haEUR ≈ 2.20 wstETH.
 * The correction minted 1.3978381022114285 wstETH of hsSTETH-EUR.
 * 1.6293098430224152 wstETH is still owed for phase 2 and is not in this price.
 */
const STETH_EUR_SUPPLY_BEFORE_INCIDENT = 10_762.406044992895027729;
const STETH_EUR_PRICE_BEFORE_INCIDENT = 0.826780103227000218;
const STETH_EUR_SUPPLY_AFTER_RECAP = 97_769.688696788525638751;
const STETH_EUR_PRICE_AFTER_RECAP = 0.039631887639505445;

const bookBeforeIncident =
  STETH_EUR_PRICE_BEFORE_INCIDENT * STETH_EUR_SUPPLY_BEFORE_INCIDENT;
const bookAfterRecap = STETH_EUR_PRICE_AFTER_RECAP * STETH_EUR_SUPPLY_AFTER_RECAP;
/** Live unit price × this scale = today's book on the pre-incident share count. */
const STETH_EUR_PRICE_SCALE =
  (bookAfterRecap / bookBeforeIncident) *
  (STETH_EUR_PRICE_BEFORE_INCIDENT / STETH_EUR_PRICE_AFTER_RECAP);

export type SailPriceRebase = {
  marketId: string;
  /** First block of the upgraded minter (recap mint). */
  fromBlock: number;
  /** Block timestamp of `fromBlock` (2026-11-13T18:34:23Z). */
  fromTimestamp: number;
  /**
   * Collateral drop on 16 Oct 2026, 12:09 UTC. Windows that open after this
   * already start on the diluted unit price, so the book scale would turn a
   * flat day into a fake ~9× gain.
   */
  incidentTimestamp: number;
  priceScale: number;
  /** Shown on the Hyperliquid comparison when this market's window is rebased. */
  note: string;
};

export const STETH_EUR_SAIL_REBASE: SailPriceRebase = {
  marketId: "steth-eur",
  fromBlock: 26_407_867,
  fromTimestamp: 1_794_594_863,
  incidentTimestamp: 1_792_152_563,
  priceScale: STETH_EUR_PRICE_SCALE,
  note: "stETH–EUR sail prices from the 13 Nov 2026 recap are rebased to price × supply against the 15 Oct pre-incident book, on the pre-incident share count.",
};

/**
 * Markets with a book rebase. hsSTETH–BTC is not listed: it needs its own
 * pre-incident price, post-issuance price, and supply. Every other market
 * keeps the raw unit price.
 */
const SAIL_PRICE_REBASES: Record<string, SailPriceRebase> = {
  "steth-eur": STETH_EUR_SAIL_REBASE,
};

export function sailPriceRebaseFor(marketId: string): SailPriceRebase | null {
  return SAIL_PRICE_REBASES[marketId] ?? null;
}

export type SailChartEvent = {
  timestamp: number;
  label: string;
  tone: "incident" | "rebase";
};

/** Days to mark on a chart that has a book rebase. Other markets get none. */
export function sailChartEvents(marketId: string): SailChartEvent[] {
  const rule = sailPriceRebaseFor(marketId);
  if (!rule) return [];
  return [
    { timestamp: rule.incidentTimestamp, label: "Incident", tone: "incident" },
    { timestamp: rule.fromTimestamp, label: "Rebase", tone: "rebase" },
  ];
}

export type SnappedSailChartEvent = SailChartEvent & {
  /**
   * Value for Recharts `ReferenceLine x`.
   * A category axis with a repeated timestamp switches its scale to point
   * indexes, so the line has to use that index. Unique timestamps stay as
   * the timestamp itself.
   */
  x: number;
  /** Chart point the marker is snapped to. Tooltip matches this. */
  pointTimestamp: number;
};

/**
 * Keep events inside the window and snap each one to the nearest point.
 * An event outside the window is dropped, including one that would otherwise
 * stick to the first or last point.
 */
export function snapSailChartEvents(
  data: Array<{ timestamp: number }>,
  events: SailChartEvent[],
): SnappedSailChartEvent[] {
  if (data.length < 2 || events.length === 0) return [];
  const timestamps = data.map((row) => row.timestamp);
  const start = Math.min(timestamps[0]!, timestamps[timestamps.length - 1]!);
  const end = Math.max(timestamps[0]!, timestamps[timestamps.length - 1]!);
  const scaleByIndex = new Set(timestamps).size !== timestamps.length;

  return events.flatMap((event) => {
    if (event.timestamp < start || event.timestamp > end) return [];
    let index = 0;
    let distance = Math.abs(timestamps[0]! - event.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      const next = Math.abs(timestamps[i]! - event.timestamp);
      if (next < distance) {
        index = i;
        distance = next;
      }
    }
    return [
      {
        ...event,
        x: scaleByIndex ? index : timestamps[index]!,
        pointTimestamp: timestamps[index]!,
      },
    ];
  });
}

/** Book rebase only when this market has a rule and the window still starts before its incident. */
export function sailBookRebaseApplies(
  marketId: string,
  windowStartTimestamp: number,
): boolean {
  const rule = sailPriceRebaseFor(marketId);
  if (!rule) return false;
  return windowStartTimestamp < rule.incidentTimestamp;
}

function scaleReturnPct(returnPct: number, priceScale: number): number {
  return ((1 + returnPct / 100) * priceScale - 1) * 100;
}

type PricedSailState = Pick<
  SailStateObservation,
  "timestamp" | "sailPriceUsd" | "navInPeg"
>;

/** Multiply post-recap unit prices. Earlier observations stay on the raw unit price. */
export function rebaseSailStatePrices<T extends PricedSailState>(
  marketId: string,
  states: T[],
  windowStartTimestamp = 0,
): T[] {
  const rule = sailPriceRebaseFor(marketId);
  if (!rule || !sailBookRebaseApplies(marketId, windowStartTimestamp)) return states;
  return states.map((state) => {
    if (state.timestamp < rule.fromTimestamp) return state;
    if (!(state.sailPriceUsd > 0)) return state;
    const navInPeg = state.navInPeg;
    return {
      ...state,
      sailPriceUsd: state.sailPriceUsd * rule.priceScale,
      ...(navInPeg != null && navInPeg > 0
        ? { navInPeg: navInPeg * rule.priceScale }
        : {}),
    };
  });
}

type ChartHsPoint = {
  timestamp: number;
  hsPriceUsd: number;
};

/**
 * Rebase leveraged-token USD on the chart timeline. If history has not yet
 * indexed an hour after the recap, append the recovered price at the recap
 * so the line steps up immediately.
 */
export function rebaseSailChartHsPrices<T extends ChartHsPoint>(
  marketId: string,
  points: T[],
  nowTimestamp = Math.floor(Date.now() / 1000),
): T[] {
  const rule = sailPriceRebaseFor(marketId);
  const windowStart = points[0]?.timestamp ?? nowTimestamp;
  if (!rule || points.length === 0 || !sailBookRebaseApplies(marketId, windowStart)) {
    return points;
  }

  const scaled = points.map((point) => {
    if (point.timestamp < rule.fromTimestamp) return point;
    if (!Number.isFinite(point.hsPriceUsd) || point.hsPriceUsd <= 0) return point;
    return { ...point, hsPriceUsd: point.hsPriceUsd * rule.priceScale };
  });

  if (nowTimestamp < rule.fromTimestamp) return scaled;
  const hasPostRecapPrice = scaled.some(
    (point) =>
      point.timestamp >= rule.fromTimestamp &&
      Number.isFinite(point.hsPriceUsd) &&
      point.hsPriceUsd > 0,
  );
  if (hasPostRecapPrice) return scaled;

  const last = [...scaled]
    .reverse()
    .find((point) => Number.isFinite(point.hsPriceUsd) && point.hsPriceUsd > 0);
  if (!last || last.timestamp >= rule.fromTimestamp) return scaled;

  return [
    ...scaled,
    {
      ...last,
      timestamp: rule.fromTimestamp,
      hsPriceUsd: last.hsPriceUsd * rule.priceScale,
    },
  ];
}

/**
 * Sail-net returns are marked on Hyperliquid hours. Insert the recovered
 * price at the recap when the latest candle is still the pre-mint hour, and
 * move the headline return with it.
 */
export function rebaseSailBenchmarkReturns(
  marketId: string,
  benchmark: SailPerpBenchmarkResult,
  windowEndTimestamp: number,
  windowStartTimestamp = 0,
): SailPerpBenchmarkResult {
  const rule = sailPriceRebaseFor(marketId);
  if (
    !rule ||
    !sailBookRebaseApplies(marketId, windowStartTimestamp) ||
    windowEndTimestamp < rule.fromTimestamp
  ) {
    return benchmark;
  }

  const points = [...benchmark.points].sort((a, b) => a.timestamp - b.timestamp);
  if (points.length === 0) return benchmark;

  const prior = [...points].reverse().find((point) => point.timestamp < rule.fromTimestamp);
  const alreadyMarked = points.some((point) => point.timestamp >= rule.fromTimestamp);
  if (!prior) return benchmark;

  const nextPoints = points.some((point) => point.timestamp === rule.fromTimestamp)
    ? points
    : [...points, {
        ...prior,
        timestamp: rule.fromTimestamp,
        sailReturnPct: scaleReturnPct(prior.sailReturnPct, rule.priceScale),
      }].sort((a, b) => a.timestamp - b.timestamp);

  if (alreadyMarked) {
    return { ...benchmark, points: nextPoints };
  }

  return {
    ...benchmark,
    points: nextPoints,
    sailGrossReturnPct: scaleReturnPct(benchmark.sailGrossReturnPct, rule.priceScale),
    sailNetReturnPct: scaleReturnPct(benchmark.sailNetReturnPct, rule.priceScale),
    costs: {
      ...benchmark.costs,
      sailRedeemFeeUsd: benchmark.costs.sailRedeemFeeUsd * rule.priceScale,
    },
  };
}
