import { describe, expect, it } from "vitest";
import type { DefinedMarket } from "@/config/markets";
import { buildSailMarketDropdownPositionDisplay } from "./sailMarketDropdownPositionDisplay";

const market = {
  leveragedToken: { symbol: "hsSTETH-BTC" },
} as DefinedMarket;

describe("buildSailMarketDropdownPositionDisplay", () => {
  it("returns pending USD label while PnL is loading", () => {
    const result = buildSailMarketDropdownPositionDisplay({
      market,
      userDeposit: 1_000_000_000_000_000_000n,
      leveragedPriceUSD: 2.2,
      costBasisUSD: 1.5,
      pnlLoading: true,
    });

    expect(result.hasPosition).toBe(true);
    expect(result.label).toBe("$2.20");
    expect(result.tone).toBe("pending");
  });

  it("returns signed PnL label once subgraph data is ready", () => {
    const result = buildSailMarketDropdownPositionDisplay({
      market,
      userDeposit: 1_000_000_000_000_000_000n,
      leveragedPriceUSD: 2.2,
      costBasisUSD: 1.5,
      pnlLoading: false,
    });

    expect(result.hasPosition).toBe(true);
    expect(result.label).toBe("+$0.70");
    expect(result.tone).toBe("up");
  });
});
