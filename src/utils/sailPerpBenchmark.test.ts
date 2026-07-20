import { describe, expect, it } from "vitest";
import {
  isHip3PerpCoin,
  isSailFeeDisallowBps,
  modeledSailFeeRateFromBps,
  PERP_COIN_API_SYMBOL,
  resolveSailPerpExposureFromSymbols,
  runSailPerpBenchmark,
  targetPerpNotionals,
  type SailPerpBenchmarkAssumptions,
  type SailStateObservation,
} from "./sailPerpBenchmark";

const assumptions: SailPerpBenchmarkAssumptions = {
  startingCapitalUsd: 1_000,
  takerFeeBps: 0,
  slippageBps: 0,
  maintenanceMarginRate: 0.03,
  liquidationPenaltyRate: 0.005,
  sailMintFeeBps: 0,
  sailRedeemFeeBps: 0,
};

const states: SailStateObservation[] = [
  {
    timestamp: 1_700_000_000,
    blockNumber: 1,
    sailPriceUsd: 10,
    leverageRatio: 2,
    collateralRatio: 2,
  },
  {
    timestamp: 1_700_003_600,
    blockNumber: 2,
    sailPriceUsd: 11,
    leverageRatio: 2,
    collateralRatio: 2,
  },
];

describe("targetPerpNotionals", () => {
  it("models collateral leverage and peg debt as separate legs", () => {
    expect(
      targetPerpNotionals(1_000, 2.5, {
        collateralCoin: "ETH",
        targetCoin: "BTC",
      }),
    ).toEqual({ ETH: 2_500, BTC: -1_500 });
  });

  it("nets identical collateral and target legs", () => {
    expect(
      targetPerpNotionals(1_000, 2, {
        collateralCoin: "ETH",
        targetCoin: "ETH",
      }),
    ).toEqual({ ETH: 1_000 });
  });
});

describe("runSailPerpBenchmark", () => {
  it("applies short price PnL and positive funding as a credit", () => {
    const result = runSailPerpBenchmark({
      states,
      exposure: { collateralCoin: null, targetCoin: "ETH" },
      assumptions,
      candlesByCoin: {
        ETH: [
          { timestamp: states[0]!.timestamp, open: 100, high: 101, low: 99, close: 100 },
          { timestamp: states[1]!.timestamp, open: 100, high: 101, low: 89, close: 90 },
        ],
      },
      fundingByCoin: {
        ETH: [{ timestamp: states[1]!.timestamp, rate: 0.001 }],
      },
    });

    expect(result.perpReturnPct).toBeGreaterThan(10);
    expect(result.costs.fundingUsd).toBeLessThan(0);
    expect(result.sailGrossReturnPct).toBeCloseTo(10);
  });

  it("charges entry and exit turnover only", () => {
    const result = runSailPerpBenchmark({
      states,
      exposure: { collateralCoin: "ETH", targetCoin: null },
      assumptions: { ...assumptions, takerFeeBps: 5, slippageBps: 1 },
      candlesByCoin: {
        ETH: [
          { timestamp: states[0]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
          { timestamp: states[1]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
        ],
      },
      fundingByCoin: { ETH: [] },
    });

    expect(result.costs.tradingFeesUsd).toBeGreaterThan(0);
    expect(result.costs.slippageUsd).toBeGreaterThan(0);
    expect(result.perpReturnPct).toBeLessThan(0);
  });

  it("does not resize when Sail leverage changes mid-period", () => {
    const changingLeverageStates: SailStateObservation[] = [
      {
        timestamp: 1_700_000_000,
        blockNumber: 1,
        sailPriceUsd: 10,
        leverageRatio: 2,
        collateralRatio: 2,
      },
      {
        timestamp: 1_700_001_800,
        blockNumber: 2,
        sailPriceUsd: 10,
        leverageRatio: 4,
        collateralRatio: 2,
      },
      {
        timestamp: 1_700_003_600,
        blockNumber: 3,
        sailPriceUsd: 10,
        leverageRatio: 4,
        collateralRatio: 2,
      },
    ];
    const result = runSailPerpBenchmark({
      states: changingLeverageStates,
      exposure: { collateralCoin: "ETH", targetCoin: null },
      assumptions: { ...assumptions, takerFeeBps: 5, slippageBps: 1 },
      candlesByCoin: {
        ETH: [
          {
            timestamp: changingLeverageStates[0]!.timestamp,
            open: 100,
            high: 100,
            low: 100,
            close: 100,
          },
          {
            timestamp: changingLeverageStates[1]!.timestamp,
            open: 100,
            high: 100,
            low: 100,
            close: 100,
          },
          {
            timestamp: changingLeverageStates[2]!.timestamp,
            open: 100,
            high: 100,
            low: 100,
            close: 100,
          },
        ],
      },
      fundingByCoin: { ETH: [] },
    });

    expect(result.openingLeverageRatio).toBe(2);
    expect(result.costs.tradingFeesUsd).toBeCloseTo(2);
    expect(result.costs.slippageUsd).toBeCloseTo(0.4);
  });

  it("freezes the strategy after an adverse intrahour liquidation", () => {
    const result = runSailPerpBenchmark({
      states,
      exposure: { collateralCoin: "ETH", targetCoin: null },
      assumptions,
      candlesByCoin: {
        ETH: [
          { timestamp: states[0]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
          { timestamp: states[1]!.timestamp, open: 100, high: 105, low: 1, close: 100 },
        ],
      },
      fundingByCoin: { ETH: [] },
    });

    expect(result.liquidatedAt).toBe(states[1]!.timestamp);
    expect(result.costs.liquidationImpactUsd).toBeGreaterThan(0);
  });

  it("deducts Sail entry and exit fees from net return", () => {
    const result = runSailPerpBenchmark({
      states,
      exposure: { collateralCoin: null, targetCoin: "ETH" },
      assumptions: {
        ...assumptions,
        sailMintFeeBps: 100,
        sailRedeemFeeBps: 100,
      },
      candlesByCoin: {
        ETH: [
          { timestamp: states[0]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
          { timestamp: states[1]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
        ],
      },
      fundingByCoin: { ETH: [] },
    });

    expect(result.sailGrossReturnPct).toBeCloseTo(10);
    expect(result.sailNetReturnPct).toBeLessThan(result.sailGrossReturnPct);
    expect(result.costs.sailMintFeeUsd).toBe(10);
    expect(result.costs.sailRedeemFeeUsd).toBeGreaterThan(0);
  });

  it("uses timestamped Sail redemption fees for the net return series", () => {
    const result = runSailPerpBenchmark({
      states,
      exposure: { collateralCoin: null, targetCoin: "ETH" },
      assumptions,
      sailRedeemFeeBpsByTimestamp: [
        { timestamp: states[0]!.timestamp, feeBps: 100 },
        { timestamp: states[1]!.timestamp, feeBps: 500 },
      ],
      candlesByCoin: {
        ETH: [
          { timestamp: states[0]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
          { timestamp: states[1]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
        ],
      },
      fundingByCoin: { ETH: [] },
    });

    expect(result.points[0]!.sailReturnPct).toBeCloseTo(-1);
    expect(result.points[1]!.sailReturnPct).toBeCloseTo(4.5);
    expect(result.sailNetReturnPct).toBeCloseTo(4.5);
  });

  it("ignores 100% disallow mint/redeem bands instead of wiping Sail to -100%", () => {
    const result = runSailPerpBenchmark({
      states,
      exposure: { collateralCoin: null, targetCoin: "ETH" },
      assumptions: {
        ...assumptions,
        sailMintFeeBps: 10_000,
        sailRedeemFeeBps: 10_000,
      },
      sailRedeemFeeBpsByTimestamp: [
        { timestamp: states[0]!.timestamp, feeBps: 10_000 },
        { timestamp: states[1]!.timestamp, feeBps: 10_000 },
      ],
      candlesByCoin: {
        ETH: [
          { timestamp: states[0]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
          { timestamp: states[1]!.timestamp, open: 100, high: 100, low: 100, close: 100 },
        ],
      },
      fundingByCoin: { ETH: [] },
    });

    expect(result.costs.sailMintFeeUsd).toBe(0);
    expect(result.costs.sailRedeemFeeUsd).toBe(0);
    expect(result.points[0]!.sailReturnPct).toBeCloseTo(0);
    expect(result.points[1]!.sailReturnPct).toBeCloseTo(10);
    expect(result.sailNetReturnPct).toBeCloseTo(10);
  });
});

describe("resolveSailPerpExposureFromSymbols", () => {
  it("supports USD-peg long ETH and ETH/BTC peg shorts", () => {
    expect(resolveSailPerpExposureFromSymbols("wstETH", "USD")).toEqual({
      collateralCoin: "ETH",
      targetCoin: null,
    });
    expect(resolveSailPerpExposureFromSymbols("fxUSD", "ETH")).toEqual({
      collateralCoin: null,
      targetCoin: "ETH",
    });
    expect(resolveSailPerpExposureFromSymbols("wstETH", "BTC")).toEqual({
      collateralCoin: "ETH",
      targetCoin: "BTC",
    });
  });

  it("supports EUR and metals pegs via HIP-3 hedge legs", () => {
    expect(resolveSailPerpExposureFromSymbols("wstETH", "EUR")).toEqual({
      collateralCoin: "ETH",
      targetCoin: "EUR",
    });
    expect(resolveSailPerpExposureFromSymbols("fxUSD", "EUR")).toEqual({
      collateralCoin: null,
      targetCoin: "EUR",
    });
    expect(resolveSailPerpExposureFromSymbols("wstETH", "GOLD")).toEqual({
      collateralCoin: "ETH",
      targetCoin: "GOLD",
    });
    expect(resolveSailPerpExposureFromSymbols("wstETH", "SILVER")).toEqual({
      collateralCoin: "ETH",
      targetCoin: "SILVER",
    });
  });

  it("rejects pegs without a Hyperliquid hedge leg", () => {
    expect(resolveSailPerpExposureFromSymbols("wstETH", "MCAP")).toBeNull();
    expect(resolveSailPerpExposureFromSymbols("fxUSD", "USD")).toBeNull();
  });
});

describe("PERP_COIN_API_SYMBOL", () => {
  it("maps HIP-3 assets to dex-prefixed Hyperliquid symbols", () => {
    expect(PERP_COIN_API_SYMBOL.EUR).toBe("xyz:EUR");
    expect(PERP_COIN_API_SYMBOL.GOLD).toBe("xyz:GOLD");
    expect(isHip3PerpCoin("EUR")).toBe(true);
    expect(isHip3PerpCoin("ETH")).toBe(false);
  });
});

describe("modeledSailFeeRateFromBps", () => {
  it("treats absolute 100% bands as disallow, not a payable fee", () => {
    expect(isSailFeeDisallowBps(10_000)).toBe(true);
    expect(modeledSailFeeRateFromBps(10_000)).toBe(0);
    expect(modeledSailFeeRateFromBps(100)).toBeCloseTo(0.01);
  });
});
