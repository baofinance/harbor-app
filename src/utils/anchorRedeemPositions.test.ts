import { describe, expect, it } from "vitest";
import type { DefinedMarket } from "@/config/markets";
import {
  buildAnchorRedeemPositions,
  redeemPositionTitle,
} from "./anchorRedeemPositions";

const marketA = {
  name: "fxUSD - ETH",
  collateral: { symbol: "fxSAVE" },
} as DefinedMarket;

const marketB = {
  name: "stETH - ETH",
  collateral: { symbol: "wstETH" },
} as DefinedMarket;

describe("buildAnchorRedeemPositions", () => {
  it("includes wallet and non-zero pools only", () => {
    const positions = buildAnchorRedeemPositions({
      peggedBalance: 5n * 10n ** 18n,
      poolRows: [
        {
          key: "a-collateral",
          marketId: "a",
          market: marketA,
          poolType: "collateral",
          poolAddress: "0xaaa",
          balance: 2n * 10n ** 18n,
        },
        {
          key: "a-sail",
          marketId: "a",
          market: marketA,
          poolType: "sail",
          poolAddress: "0xbbb",
          balance: 0n,
        },
        {
          key: "b-collateral",
          marketId: "b",
          market: marketB,
          poolType: "collateral",
          poolAddress: "0xccc",
          balance: 1n * 10n ** 18n,
        },
      ],
    });

    expect(positions.map((p) => p.key)).toEqual([
      "wallet",
      "a-collateral",
      "b-collateral",
    ]);
  });

  it("pins window-open pools after wallet", () => {
    const windowOpenByPoolAddress = new Map([
      ["0xccc", true],
      ["0xaaa", false],
    ]);
    const positions = buildAnchorRedeemPositions({
      peggedBalance: 0n,
      poolRows: [
        {
          key: "a-collateral",
          marketId: "a",
          market: marketA,
          poolType: "collateral",
          poolAddress: "0xaaa",
          balance: 2n * 10n ** 18n,
        },
        {
          key: "b-collateral",
          marketId: "b",
          market: marketB,
          poolType: "collateral",
          poolAddress: "0xccc",
          balance: 1n * 10n ** 18n,
        },
      ],
      windowOpenByPoolAddress,
    });

    expect(positions.map((p) => p.key)).toEqual([
      "b-collateral",
      "a-collateral",
    ]);
    expect(positions[0]?.kind === "pool" && positions[0].windowOpen).toBe(true);
  });
});

describe("redeemPositionTitle", () => {
  it("labels wallet and pool kinds", () => {
    expect(
      redeemPositionTitle(
        { key: "wallet", kind: "wallet", balance: 1n },
        "haETH",
      ),
    ).toBe("In wallet");
    expect(
      redeemPositionTitle(
        {
          key: "a-sail",
          kind: "pool",
          marketId: "a",
          market: marketA,
          poolType: "sail",
          poolAddress: "0xbbb",
          balance: 1n,
        },
        "haETH",
      ),
    ).toBe("Earn · Sail");
    expect(
      redeemPositionTitle(
        {
          key: "a-collateral",
          kind: "pool",
          marketId: "a",
          market: marketA,
          poolType: "collateral",
          poolAddress: "0xaaa",
          balance: 1n,
        },
        "haETH",
      ),
    ).toBe("Earn · fxSAVE");
  });
});
