import { describe, expect, it } from "vitest";
import type { DefinedMarket } from "@/config/markets";
import {
  computeSailMarketTvlUsd,
  isSailDepositsPausedByLeverage,
  pickDefaultSailMarketId,
  resolveMinCollateralRatio,
} from "./sailMarketMetrics";

const fxSaveMarket = {
  collateral: { symbol: "fxSAVE" },
  pegTarget: "USD",
} as DefinedMarket;

const wstEthMarket = {
  collateral: { symbol: "wstETH" },
  pegTarget: "USD",
} as DefinedMarket;

describe("pickDefaultSailMarketId", () => {
  it("returns null for empty markets", () => {
    expect(pickDefaultSailMarketId([], new Map())).toBeNull();
  });

  it("picks highest TVL market", () => {
    const markets: [string, DefinedMarket][] = [
      ["eth-a", wstEthMarket],
      ["eth-b", wstEthMarket],
      ["eth-c", wstEthMarket],
    ];
    const tvl = new Map([
      ["eth-a", 100],
      ["eth-b", 500],
      ["eth-c", 200],
    ]);
    expect(pickDefaultSailMarketId(markets, tvl)).toBe("eth-b");
  });

  it("tie-breaks by marketId ascending", () => {
    const markets: [string, DefinedMarket][] = [
      ["z-market", wstEthMarket],
      ["a-market", wstEthMarket],
    ];
    const tvl = new Map([
      ["z-market", 100],
      ["a-market", 100],
    ]);
    expect(pickDefaultSailMarketId(markets, tvl)).toBe("a-market");
  });

  it("skips zero/undefined TVL and falls back to first sorted id", () => {
    const markets: [string, DefinedMarket][] = [
      ["b-market", wstEthMarket],
      ["a-market", wstEthMarket],
    ];
    const tvl = new Map<string, number | undefined>([
      ["b-market", 0],
      ["a-market", undefined],
    ]);
    expect(pickDefaultSailMarketId(markets, tvl)).toBe("a-market");
  });

  it("skips ~1x leverage (deposits paused) markets when alternatives exist", () => {
    const markets: [string, DefinedMarket][] = [
      ["paused", wstEthMarket],
      ["live", wstEthMarket],
    ];
    const tvl = new Map([
      ["paused", 900],
      ["live", 100],
    ]);
    const leverage = new Map<string, bigint | undefined>([
      ["paused", 10n ** 18n],
      ["live", 5n * 10n ** 18n],
    ]);
    expect(pickDefaultSailMarketId(markets, tvl, leverage)).toBe("live");
  });
});

describe("isSailDepositsPausedByLeverage", () => {
  it("treats 1.00x as paused", () => {
    expect(isSailDepositsPausedByLeverage(10n ** 18n)).toBe(true);
  });

  it("treats normal leverage as not paused", () => {
    expect(isSailDepositsPausedByLeverage(5n * 10n ** 18n)).toBe(false);
  });

  it("ignores missing leverage", () => {
    expect(isSailDepositsPausedByLeverage(undefined)).toBe(false);
  });
});

describe("computeSailMarketTvlUsd", () => {
  const collateralValue = 10n * 10n ** 18n;

  it("returns undefined when collateral is zero", () => {
    expect(
      computeSailMarketTvlUsd(fxSaveMarket, 0n, {
        fxSAVEPrice: 1.1,
        isCollateralPriceLoading: false,
        isCoinGeckoLoading: false,
      })
    ).toBeUndefined();
  });

  it("computes fxSAVE TVL from CoinGecko price", () => {
    const tvl = computeSailMarketTvlUsd(fxSaveMarket, collateralValue, {
      fxSAVEPrice: 1.1,
      wrappedRate: 10n ** 18n,
      isCollateralPriceLoading: false,
      isCoinGeckoLoading: false,
    });
    expect(tvl).toBeCloseTo(11, 2);
  });

  it("computes wstETH TVL from wstETH price", () => {
    const tvl = computeSailMarketTvlUsd(wstEthMarket, collateralValue, {
      wstETHPrice: 4000,
      wrappedRate: 10n ** 18n,
      isCollateralPriceLoading: false,
      isCoinGeckoLoading: false,
    });
    expect(tvl).toBeCloseTo(40000, 0);
  });

  it("returns undefined while prices are loading", () => {
    expect(
      computeSailMarketTvlUsd(wstEthMarket, collateralValue, {
        wstETHPrice: 4000,
        isCoinGeckoLoading: true,
      })
    ).toBeUndefined();
  });
});

describe("resolveMinCollateralRatio", () => {
  it("prefers rebalance threshold when present", () => {
    expect(resolveMinCollateralRatio(150n * 10n ** 16n, undefined)).toBe(
      150n * 10n ** 16n
    );
  });
});
