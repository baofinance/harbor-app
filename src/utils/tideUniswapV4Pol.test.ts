import { describe, expect, it } from "vitest";
import {
  decodeUniswapV4PositionTicks,
  getUniswapV4PositionAmounts,
  polOwnershipPctFromTideInPol,
  uniswapV4PoolIdFromKey,
} from "./tideUniswapV4Pol";

describe("uniswapV4PoolIdFromKey", () => {
  it("matches the wstETH / TIDE mainnet pool id", () => {
    const poolId = uniswapV4PoolIdFromKey({
      currency0: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      currency1: "0xDA187eB6F4D7eE3a0b8f5cd81eED8d347f5693aD",
      fee: 3000,
      tickSpacing: 60,
      hooks: "0x0000000000000000000000000000000000000000",
    });
    expect(poolId.toLowerCase()).toBe(
      "0x7c2a7ae6e86055412f6e2663797fcf77d669b9671cd016fe7230883e1a627196",
    );
  });
});

describe("polOwnershipPctFromTideInPol", () => {
  it("computes share of total supply", () => {
    expect(
      polOwnershipPctFromTideInPol(
        5_000_000_000000000000000000n,
        1_000_000_000_000000000000000000n,
      ),
    ).toBeCloseTo(0.5, 5);
  });
});

describe("getUniswapV4PositionAmounts", () => {
  it("returns both sides when price is in range", () => {
    const { amount0, amount1 } = getUniswapV4PositionAmounts({
      liquidity: 2236090007331273938575n,
      tickLower: -887220,
      tickUpper: 887220,
      sqrtPriceX96: 79228162514264337593543950336n,
    });
    expect(amount0).toBeGreaterThan(0n);
    expect(amount1).toBeGreaterThan(0n);
  });
});

describe("decodeUniswapV4PositionTicks", () => {
  it("decodes full-range ticks from position info", () => {
    const info =
      "0x7c2a7ae6e86055412f6e2663797fcf77d669b9671cd016fe720d89b4f2764c00" as const;
    const ticks = decodeUniswapV4PositionTicks(info);
    expect(ticks.tickLower).toBe(-887220);
    expect(ticks.tickUpper).toBe(887220);
  });
});
