import { describe, expect, it } from "vitest";
import type { DefinedMarket } from "@/config/markets";
import {
  buildAnchorPegGroups,
  findPegGroupForMarket,
  getAnchorBackingLabel,
  getAnchorPegLabel,
  pickDefaultBackingMarketId,
} from "./anchorMarketSelectors";

function mockMarket(overrides: Partial<DefinedMarket> & { pegTarget: string; collateralSymbol: string }): DefinedMarket {
  const pegTarget = overrides.pegTarget;
  return {
    name: "test",
    pegTarget,
    peggedToken: { symbol: `ha${pegTarget}`, name: "ha", description: "" },
    collateral: {
      symbol: overrides.collateralSymbol,
      name: overrides.collateralSymbol,
      underlyingSymbol: overrides.collateralSymbol,
    },
    chain: overrides.chain ?? { name: "Ethereum", logo: "icons/eth.png" },
    ...overrides,
  } as DefinedMarket;
}

describe("anchorMarketSelectors", () => {
  it("groups markets by peg and sorts backing by APY", () => {
    const markets = [
      ["btc-fxusd", mockMarket({ pegTarget: "BTC", collateralSymbol: "fxSAVE" })],
      ["btc-steth", mockMarket({ pegTarget: "BTC", collateralSymbol: "wstETH" })],
      ["eth-fxusd", mockMarket({ pegTarget: "ETH", collateralSymbol: "fxSAVE" })],
    ] as const;

    const groups = buildAnchorPegGroups(markets, {
      apyByMarketId: new Map([
        ["btc-fxusd", "2.96% APY"],
        ["btc-steth", "3.50% APY"],
        ["eth-fxusd", "1.20% APY"],
      ]),
    });

    expect(groups.map((g) => g.pegLabel)).toEqual(["haETH", "haBTC"]);
    expect(groups[1]?.backingOptions.map((o) => o.backingLabel)).toEqual([
      "wstETH",
      "fxSAVE",
    ]);
  });

  it("labels peg and backing from market config", () => {
    const market = mockMarket({ pegTarget: "EUR", collateralSymbol: "fxUSD" });
    expect(getAnchorPegLabel(market)).toBe("haEUR");
    expect(getAnchorBackingLabel(market)).toBe("fxUSD");
  });

  it("finds peg group and default backing with position", () => {
    const markets = [
      ["btc-fxusd", mockMarket({ pegTarget: "BTC", collateralSymbol: "fxSAVE" })],
      ["btc-steth", mockMarket({ pegTarget: "BTC", collateralSymbol: "wstETH" })],
    ] as const;
    const groups = buildAnchorPegGroups(markets);
    const group = findPegGroupForMarket(groups, "btc-steth");
    expect(group?.pegLabel).toBe("haBTC");
    expect(
      pickDefaultBackingMarketId(group!, (id) => id === "btc-fxusd"),
    ).toBe("btc-fxusd");
  });
});
