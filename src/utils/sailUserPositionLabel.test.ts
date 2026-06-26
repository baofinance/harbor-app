import { describe, expect, it } from "vitest";
import type { DefinedMarket } from "@/config/markets";
import { buildSailUserPositionLabel } from "./sailUserPositionLabel";

const market = {
  leveragedToken: { symbol: "hsSTETH-BTC" },
} as DefinedMarket;

describe("buildSailUserPositionLabel", () => {
  it("returns no position for zero deposit", () => {
    expect(buildSailUserPositionLabel(market, 0n, 100)).toEqual({
      hasPosition: false,
    });
  });

  it("formats USD value without NaN when price is available", () => {
    const result = buildSailUserPositionLabel(market, 1_000_000_000_000_000_000n, 2.2);
    expect(result.hasPosition).toBe(true);
    expect(result.label).toBe("Your position · $2.20");
    expect(result.label).not.toContain("NaN");
  });

  it("falls back to token amount when price is missing", () => {
    const result = buildSailUserPositionLabel(
      market,
      1_000_000_000_000_000_000n,
      undefined,
    );
    expect(result.label).toBe("Your position · 1 hsSTETH-BTC");
    expect(result.label).not.toContain("NaN");
  });
});
