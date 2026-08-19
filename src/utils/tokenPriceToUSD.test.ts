import { describe, expect, it } from "vitest";
import { amountToUSD, getTokenPriceUSD } from "./tokenPriceToUSD";

describe("getTokenPriceUSD", () => {
  it("uses on-chain leveraged NAV for hsSTETH-EUR instead of ETH spot", () => {
    const price = getTokenPriceUSD(
      "hsSTETH-EUR",
      { ethPrice: 4300, wstETHPrice: 5200, leveragedPriceUSD: 0.71 },
      "wstETH",
    );
    expect(price).toBe(0.71);
  });

  it("does not fall back to ETH spot for wstETH-backed sail without NAV", () => {
    const price = getTokenPriceUSD(
      "hsSTETH-EUR",
      { ethPrice: 4300, wstETHPrice: 5200, leveragedPriceUSD: 0 },
      "wstETH",
    );
    expect(price).toBe(0);
  });

  it("prices fxSAVE at ~$1+", () => {
    expect(getTokenPriceUSD("fxSAVE", { fxSAVEPrice: 1.12 })).toBe(1.12);
  });
});

describe("amountToUSD", () => {
  it("values ~93 hsSTETH-EUR near deposit USD when NAV is ~$0.71", () => {
    const usd = amountToUSD(93.257, "hsSTETH-EUR", {
      ethPrice: 4300,
      leveragedPriceUSD: 0.71,
    }, "wstETH");
    expect(usd).toBeCloseTo(66.2, 0);
  });
});
