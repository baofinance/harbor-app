export type PerpCoin = "BTC" | "ETH" | "EUR" | "GOLD" | "SILVER";

/** Hyperliquid info API coin id (native or HIP-3 `dex:TICKER`). */
export const PERP_COIN_API_SYMBOL: Record<PerpCoin, string> = {
  BTC: "BTC",
  ETH: "ETH",
  EUR: "xyz:EUR",
  GOLD: "xyz:GOLD",
  SILVER: "xyz:SILVER",
};

export function isHip3PerpCoin(coin: PerpCoin): boolean {
  return coin === "EUR" || coin === "GOLD" || coin === "SILVER";
}

export type SailStateObservation = {
  timestamp: number;
  blockNumber: number;
  sailPriceUsd: number;
  leverageRatio: number;
  collateralRatio: number;
  /** On-chain leveragedTokenPrice in peg units (before × peg USD). */
  navInPeg?: number;
};

export type PerpCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type PerpFundingPoint = {
  timestamp: number;
  rate: number;
};

export type SailPerpExposure = {
  collateralCoin: PerpCoin | null;
  targetCoin: PerpCoin | null;
};

export type SailPerpBenchmarkAssumptions = {
  startingCapitalUsd: number;
  takerFeeBps: number;
  slippageBps: number;
  maintenanceMarginRate: number;
  liquidationPenaltyRate: number;
  sailMintFeeBps: number;
  sailRedeemFeeBps: number;
};

export type SailPerpBenchmarkPoint = {
  timestamp: number;
  perpEquityUsd: number;
  perpReturnPct: number;
  sailReturnPct: number;
  leverageRatio: number;
};

export type SailPerpBenchmarkCosts = {
  tradingFeesUsd: number;
  slippageUsd: number;
  fundingUsd: number;
  liquidationImpactUsd: number;
  sailMintFeeUsd: number;
  sailRedeemFeeUsd: number;
};

export type SailPerpBenchmarkResult = {
  points: SailPerpBenchmarkPoint[];
  perpReturnPct: number;
  sailGrossReturnPct: number;
  sailNetReturnPct: number;
  openingLeverageRatio: number;
  liquidatedAt: number | null;
  costs: SailPerpBenchmarkCosts;
};

type PositionMap = Partial<Record<PerpCoin, number>>;

const HOUR_MS = 60 * 60 * 1000;

function hourKey(timestampSec: number): number {
  return Math.floor((timestampSec * 1000) / HOUR_MS);
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function stateAt(
  states: SailStateObservation[],
  timestamp: number,
): SailStateObservation | null {
  let match: SailStateObservation | null = null;
  for (const state of states) {
    if (state.timestamp > timestamp) break;
    match = state;
  }
  return match;
}

export function targetPerpNotionals(
  equityUsd: number,
  leverageRatio: number,
  exposure: SailPerpExposure,
): PositionMap {
  const notionals: PositionMap = {};
  const leverage = Math.max(1, leverageRatio);

  if (exposure.collateralCoin) {
    notionals[exposure.collateralCoin] =
      (notionals[exposure.collateralCoin] ?? 0) + equityUsd * leverage;
  }
  if (exposure.targetCoin) {
    notionals[exposure.targetCoin] =
      (notionals[exposure.targetCoin] ?? 0) -
      equityUsd * Math.max(0, leverage - 1);
  }

  return notionals;
}

/**
 * Map a Sail market onto Hyperliquid-tradable legs.
 * ETH/BTC use native perps; EUR/GOLD/SILVER use HIP-3 (`xyz:`) markets.
 */
export function resolveSailPerpExposureFromSymbols(
  collateralSymbol: string,
  pegTarget: string,
): SailPerpExposure | null {
  const collateral = collateralSymbol.toUpperCase();
  const peg = pegTarget.toUpperCase();
  const collateralCoin: PerpCoin | null = collateral.includes("STETH")
    ? "ETH"
    : null;

  const pegCoinByTarget: Partial<Record<string, PerpCoin>> = {
    ETH: "ETH",
    BTC: "BTC",
    EUR: "EUR",
    GOLD: "GOLD",
    SILVER: "SILVER",
  };
  const targetCoin: PerpCoin | null =
    peg === "USD" ? null : (pegCoinByTarget[peg] ?? null);

  if (peg !== "USD" && targetCoin == null) {
    return null;
  }
  if (!collateralCoin && !targetCoin) return null;
  return { collateralCoin, targetCoin };
}

/**
 * On-chain 100% (WAD) mint/redeem bands mean "disallowed", not a payable fee.
 * Applying them as 100% fees zeros Sail units / marks every exit as a total loss.
 */
export function modeledSailFeeRateFromBps(feeBps: number): number {
  if (!Number.isFinite(feeBps) || Math.abs(feeBps) >= 10_000) return 0;
  return feeBps / 10_000;
}

export function isSailFeeDisallowBps(feeBps: number): boolean {
  return Number.isFinite(feeBps) && Math.abs(feeBps) >= 10_000;
}

/** Convert on-chain NAV (peg units) to USD using the peg leg's Hyperliquid price. */
export function repriceSailStatesWithPegUsd(
  states: SailStateObservation[],
  exposure: SailPerpExposure,
  candlesByCoin: Partial<Record<PerpCoin, PerpCandle[]>>,
): SailStateObservation[] {
  const pegCoin = exposure.targetCoin;
  const pegCandles = pegCoin
    ? [...(candlesByCoin[pegCoin] ?? [])].sort(
        (a, b) => a.timestamp - b.timestamp,
      )
    : [];
  const pegByHour = new Map(
    pegCandles.map((candle) => [hourKey(candle.timestamp), candle.close]),
  );

  const pegUsdAt = (timestamp: number): number => {
    if (!pegCoin) return 1;
    const exact = pegByHour.get(hourKey(timestamp));
    if (exact != null && exact > 0) return exact;
    let best: number | null = null;
    for (const candle of pegCandles) {
      if (candle.timestamp > timestamp) break;
      if (candle.close > 0) best = candle.close;
    }
    return best ?? 0;
  };

  return states
    .map((state) => {
      const navInPeg = state.navInPeg;
      if (navInPeg == null || !(navInPeg > 0)) {
        return state;
      }
      const pegUsd = pegUsdAt(state.timestamp);
      if (!(pegUsd > 0)) {
        return state;
      }
      return {
        ...state,
        sailPriceUsd: navInPeg * pegUsd,
      };
    })
    .filter(
      (state) =>
        state.timestamp > 0 &&
        finitePositive(state.sailPriceUsd) &&
        finitePositive(state.leverageRatio),
    );
}

export function runSailPerpBenchmark({
  states,
  candlesByCoin,
  fundingByCoin,
  exposure,
  assumptions,
  sailRedeemFeeBpsByTimestamp = [],
}: {
  states: SailStateObservation[];
  candlesByCoin: Partial<Record<PerpCoin, PerpCandle[]>>;
  fundingByCoin: Partial<Record<PerpCoin, PerpFundingPoint[]>>;
  exposure: SailPerpExposure;
  assumptions: SailPerpBenchmarkAssumptions;
  sailRedeemFeeBpsByTimestamp?: Array<{
    timestamp: number;
    feeBps: number;
  }>;
}): SailPerpBenchmarkResult {
  const orderedStates = [...states]
    .filter(
      (state) =>
        state.timestamp > 0 &&
        finitePositive(state.sailPriceUsd) &&
        finitePositive(state.leverageRatio),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  const coins = Array.from(
    new Set(
      [exposure.collateralCoin, exposure.targetCoin].filter(
        (coin): coin is PerpCoin => coin != null,
      ),
    ),
  );
  const emptyCosts: SailPerpBenchmarkCosts = {
    tradingFeesUsd: 0,
    slippageUsd: 0,
    fundingUsd: 0,
    liquidationImpactUsd: 0,
    sailMintFeeUsd: 0,
    sailRedeemFeeUsd: 0,
  };

  if (orderedStates.length < 2 || coins.length === 0) {
    return {
      points: [],
      perpReturnPct: 0,
      sailGrossReturnPct: 0,
      sailNetReturnPct: 0,
      openingLeverageRatio: 0,
      liquidatedAt: null,
      costs: emptyCosts,
    };
  }

  const firstState = orderedStates[0]!;
  const lastState = orderedStates[orderedStates.length - 1]!;
  const candleMaps = Object.fromEntries(
    coins.map((coin) => [
      coin,
      new Map(
        (candlesByCoin[coin] ?? []).map((candle) => [
          hourKey(candle.timestamp),
          candle,
        ]),
      ),
    ]),
  ) as Record<PerpCoin, Map<number, PerpCandle>>;
  const fundingMaps = Object.fromEntries(
    coins.map((coin) => [
      coin,
      new Map(
        (fundingByCoin[coin] ?? []).map((point) => [
          hourKey(point.timestamp),
          point.rate,
        ]),
      ),
    ]),
  ) as Record<PerpCoin, Map<number, number>>;

  const primaryCoin = coins[0]!;
  const timeline = (candlesByCoin[primaryCoin] ?? [])
    .filter(
      (candle) =>
        candle.timestamp >= firstState.timestamp &&
        candle.timestamp <= lastState.timestamp &&
        coins.every((coin) => candleMaps[coin].has(hourKey(candle.timestamp))),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((candle) => candle.timestamp);

  if (timeline.length < 2) {
    return {
      points: [],
      perpReturnPct: 0,
      sailGrossReturnPct: 0,
      sailNetReturnPct: 0,
      openingLeverageRatio: 0,
      liquidatedAt: null,
      costs: emptyCosts,
    };
  }

  const capital = assumptions.startingCapitalUsd;
  const feeRate = assumptions.takerFeeBps / 10_000;
  const slippageRate = assumptions.slippageBps / 10_000;
  const costs = { ...emptyCosts };
  let equity = capital;
  let positions: PositionMap = {};
  let liquidatedAt: number | null = null;
  const points: SailPerpBenchmarkPoint[] = [];

  const tradeToTargets = (targets: PositionMap) => {
    for (const coin of coins) {
      const turnover = Math.abs((targets[coin] ?? 0) - (positions[coin] ?? 0));
      const fee = turnover * feeRate;
      const slippage = turnover * slippageRate;
      costs.tradingFeesUsd += fee;
      costs.slippageUsd += slippage;
      equity -= fee + slippage;
    }
    positions = targets;
  };

  const initialState = stateAt(orderedStates, timeline[0]!) ?? firstState;
  const openingLeverageRatio = initialState.leverageRatio;
  tradeToTargets(
    targetPerpNotionals(equity, openingLeverageRatio, exposure),
  );

  const sailMintRate = modeledSailFeeRateFromBps(assumptions.sailMintFeeBps);
  const orderedRedeemFees = [...sailRedeemFeeBpsByTimestamp].sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  const redeemRateAt = (timestamp: number) => {
    let feeBps = assumptions.sailRedeemFeeBps;
    for (const observation of orderedRedeemFees) {
      if (observation.timestamp > timestamp) break;
      feeBps = observation.feeBps;
    }
    return modeledSailFeeRateFromBps(feeBps);
  };
  costs.sailMintFeeUsd = capital * sailMintRate;
  const sailEntryPrice = initialState.sailPriceUsd;
  const sailUnits =
    (capital - costs.sailMintFeeUsd) / Math.max(sailEntryPrice, 1e-12);

  for (let index = 0; index < timeline.length; index++) {
    const timestamp = timeline[index]!;
    const state = stateAt(orderedStates, timestamp) ?? firstState;

    if (index > 0 && liquidatedAt == null) {
      const previousTimestamp = timeline[index - 1]!;
      const equityBeforeMove = equity;
      let grossNotional = 0;
      let worstEquity = equity;

      for (const coin of coins) {
        const previous = candleMaps[coin].get(hourKey(previousTimestamp))!;
        const current = candleMaps[coin].get(hourKey(timestamp))!;
        const signedNotional = positions[coin] ?? 0;
        grossNotional += Math.abs(signedNotional);

        const closeReturn = current.close / previous.close - 1;
        equity += signedNotional * closeReturn;

        const adversePrice = signedNotional >= 0 ? current.low : current.high;
        worstEquity += signedNotional * (adversePrice / previous.close - 1);

        const fundingRate = fundingMaps[coin].get(hourKey(timestamp)) ?? 0;
        const fundingCost = signedNotional * fundingRate;
        costs.fundingUsd += fundingCost;
        equity -= fundingCost;
      }

      // Two-leg Sail-sized notionals can imply MM > equity at open under a flat
      // notional MM model (false instant liquidation). Only apply MM when it is
      // solvent at the start of the hour; otherwise use bankruptcy (equity <= 0).
      const rawMaintenance =
        grossNotional * assumptions.maintenanceMarginRate;
      const maintenanceRequired =
        rawMaintenance < equityBeforeMove ? rawMaintenance : 0;
      if (worstEquity <= maintenanceRequired) {
        const penalty = grossNotional * assumptions.liquidationPenaltyRate;
        const beforeLiquidation = equity;
        equity = Math.max(0, Math.min(equity, worstEquity) - penalty);
        costs.liquidationImpactUsd += Math.max(0, beforeLiquidation - equity);
        positions = {};
        liquidatedAt = timestamp;
      }
    }

    const sailValueBeforeRedeem = sailUnits * state.sailPriceUsd;
    const sailRedeemRate = redeemRateAt(timestamp);
    const sailValueAfterRedeem =
      sailValueBeforeRedeem * (1 - sailRedeemRate);
    points.push({
      timestamp,
      perpEquityUsd: equity,
      perpReturnPct: (equity / capital - 1) * 100,
      sailReturnPct: (sailValueAfterRedeem / capital - 1) * 100,
      leverageRatio: state.leverageRatio,
    });
  }

  if (liquidatedAt == null) {
    tradeToTargets({});
    const lastPoint = points[points.length - 1];
    if (lastPoint) {
      lastPoint.perpEquityUsd = equity;
      lastPoint.perpReturnPct = (equity / capital - 1) * 100;
    }
  }

  const endState =
    stateAt(orderedStates, timeline[timeline.length - 1]!) ?? lastState;
  const sailGrossEndValue =
    capital * (endState.sailPriceUsd / sailEntryPrice);
  const sailValueBeforeRedeem = sailUnits * endState.sailPriceUsd;
  costs.sailRedeemFeeUsd =
    sailValueBeforeRedeem * redeemRateAt(endState.timestamp);
  const sailNetEndValue = sailValueBeforeRedeem - costs.sailRedeemFeeUsd;

  return {
    points,
    perpReturnPct: (equity / capital - 1) * 100,
    sailGrossReturnPct: (sailGrossEndValue / capital - 1) * 100,
    sailNetReturnPct: (sailNetEndValue / capital - 1) * 100,
    openingLeverageRatio,
    liquidatedAt,
    costs,
  };
}
