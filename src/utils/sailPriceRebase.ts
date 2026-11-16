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
/**
 * leverageRatio() at block 26,199,194. On this minter that is
 * collateralRatio / (collateralRatio − 1). CR then was 2.347348755734854735.
 */
const STETH_EUR_LEVERAGE_BEFORE_INCIDENT = 1.7421983326466888;

/**
 * hsSTETH–BTC, read on its own minter. Do not reuse the EUR supplies.
 * Block 26,204,583, 16 Oct 2026 10:45 UTC, the block before the exploit:
 *   0.677930642685253225 hs at 0.711732622310828724 haBTC.
 * Block 26,427,184, 16 Nov 2026 11:06 UTC, the restoration mint:
 *   5.372018515563421965 hs at 0.053521458060658126 haBTC.
 */
const STETH_BTC_SUPPLY_BEFORE_INCIDENT = 0.677930642685253225;
const STETH_BTC_PRICE_BEFORE_INCIDENT = 0.711732622310828724;
const STETH_BTC_SUPPLY_AFTER_RECAP = 5.372018515563421965;
const STETH_BTC_PRICE_AFTER_RECAP = 0.053521458060658126;
const btcBookBefore =
  STETH_BTC_PRICE_BEFORE_INCIDENT * STETH_BTC_SUPPLY_BEFORE_INCIDENT;
const btcBookAfter = STETH_BTC_PRICE_AFTER_RECAP * STETH_BTC_SUPPLY_AFTER_RECAP;
const STETH_BTC_PRICE_SCALE =
  (btcBookAfter / btcBookBefore) *
  (STETH_BTC_PRICE_BEFORE_INCIDENT / STETH_BTC_PRICE_AFTER_RECAP);
/** leverageRatio() at block 26,204,583, the block before the exploit. */
const STETH_BTC_LEVERAGE_BEFORE_INCIDENT = 2.3078997923852054;

export type SailPriceRebase = {
  marketId: string;
  /** First block of the upgraded minter (recap mint). */
  fromBlock: number;
  /** Block timestamp of `fromBlock` (2026-11-13T18:34:23Z). */
  fromTimestamp: number;
  /**
   * That market's collateral drop on 16 Oct 2026. Windows that open after
   * this already start on the diluted unit price, so the book scale would
   * turn a flat day into a fake multiple of the real move.
   */
  incidentTimestamp: number;
  priceScale: number;
  /**
   * leverageRatio() on the block before that market's collateral drop.
   * Windows that open while the book is still diluted use this, because the
   * on-chain ratio after the drop is the missing collateral, not a position
   * a trader would have opened.
   */
  preIncidentLeverageRatio: number;
  /** Shown on the Hyperliquid comparison when this market's window is rebased. */
  note: string;
};

export const STETH_EUR_SAIL_REBASE: SailPriceRebase = {
  marketId: "steth-eur",
  fromBlock: 26_407_867,
  fromTimestamp: 1_794_594_863,
  incidentTimestamp: 1_792_152_563,
  priceScale: STETH_EUR_PRICE_SCALE,
  preIncidentLeverageRatio: STETH_EUR_LEVERAGE_BEFORE_INCIDENT,
  note: "stETH–EUR sail prices from the 13 Nov 2026 recap are rebased to price × supply against the 15 Oct pre-incident book, on the pre-incident share count.",
};

export const STETH_BTC_SAIL_REBASE: SailPriceRebase = {
  marketId: "btc-steth",
  fromBlock: 26_427_184,
  fromTimestamp: 1_794_827_207,
  incidentTimestamp: 1_792_147_547,
  priceScale: STETH_BTC_PRICE_SCALE,
  preIncidentLeverageRatio: STETH_BTC_LEVERAGE_BEFORE_INCIDENT,
  note: "stETH–BTC sail prices from the 16 Nov 2026 recap are rebased to price × supply against the pre-incident book, on that market's own pre-incident share count.",
};

/**
 * Markets with a book rebase. Each entry uses that market's own price and
 * supply. Every other market keeps the raw unit price.
 */
const SAIL_PRICE_REBASES: Record<string, SailPriceRebase> = {
  "steth-eur": STETH_EUR_SAIL_REBASE,
  "btc-steth": STETH_BTC_SAIL_REBASE,
};

export function sailPriceRebaseFor(marketId: string): SailPriceRebase | null {
  return SAIL_PRICE_REBASES[marketId] ?? null;
}

export type SailChartEvent = {
  timestamp: number;
  label: string;
  tone: "incident" | "rebase" | "unpause";
};

/**
 * First block where leveragedTokenPrice() succeeded again after the October
 * pause. These markets were not part of the stETH dilution, so the marker
 * does not change the price or the Hyperliquid leverage.
 *
 * eth-fxusd block 26,427,194. btc-fxusd block 26,427,189.
 * fxusd-eur block 26,426,861.
 */
const SAIL_UNPAUSE_EVENTS: Record<string, SailChartEvent> = {
  "eth-fxusd": {
    timestamp: 1_794_827_327,
    label: "Unpause",
    tone: "unpause",
  },
  "btc-fxusd": {
    timestamp: 1_794_827_267,
    label: "Unpause",
    tone: "unpause",
  },
  "fxusd-eur": {
    timestamp: 1_794_823_319,
    label: "Unpause",
    tone: "unpause",
  },
};

/** Incident and rebase on a restored stETH market, plus any unpause marker. */
export function sailChartEvents(marketId: string): SailChartEvent[] {
  const rule = sailPriceRebaseFor(marketId);
  const events: SailChartEvent[] = rule
    ? [
        { timestamp: rule.incidentTimestamp, label: "Incident", tone: "incident" },
        { timestamp: rule.fromTimestamp, label: "Rebase", tone: "rebase" },
      ]
    : [];
  const unpause = SAIL_UNPAUSE_EVENTS[marketId];
  if (unpause && !events.some((event) => event.timestamp === unpause.timestamp)) {
    events.push(unpause);
  }
  return events;
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

/**
 * Leverage used to size the Hyperliquid book.
 * A window that opens after the collateral drop and before the recap still
 * reads the diluted on-chain ratio (about 5× on hsSTETH–BTC). Size that
 * comparison at the pre-incident ratio instead. Windows that already start
 * on the pre-incident or post-recap ratio keep the chain reading.
 */
export function sailPerpOpeningLeverage(
  marketId: string,
  firstStateTimestamp: number,
  onChainLeverage: number,
): number {
  const rule = sailPriceRebaseFor(marketId);
  if (!rule) return onChainLeverage;
  if (
    firstStateTimestamp >= rule.incidentTimestamp &&
    firstStateTimestamp < rule.fromTimestamp
  ) {
    return rule.preIncidentLeverageRatio;
  }
  return onChainLeverage;
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
