import { describe, expect, it } from "vitest";
import {
  buildSuggestedAdminTokenPrices,
  formatAdminPriceUsd,
  formatAdminRewardPriceUsd,
  inferPegTargetFromHaSymbol,
  isPrimaryRewardTokenSymbol,
  resolveHaTokenUsdPrice,
  resolvePegTargetUsdPrice,
  resolveRewardTokenUsdPrice,
} from "./adminRewardTokenPrices";

const pegPrices = {
  ethPrice: 3000,
  btcPrice: 60000,
  eurPrice: 1.08,
  goldPrice: 2000,
  silverPrice: 25,
};

describe("adminRewardTokenPrices", () => {
  it("maps peg targets to USD prices", () => {
    expect(resolvePegTargetUsdPrice("ETH", pegPrices)).toBe(3000);
    expect(resolvePegTargetUsdPrice("BTC", pegPrices)).toBe(60000);
    expect(resolvePegTargetUsdPrice("USD", pegPrices)).toBe(1);
    expect(resolvePegTargetUsdPrice("GOLD", pegPrices)).toBe(2000);
  });

  it("infers peg target from ha symbol", () => {
    expect(inferPegTargetFromHaSymbol("haETH")).toBe("ETH");
    expect(inferPegTargetFromHaSymbol("haBTC")).toBe("BTC");
    expect(inferPegTargetFromHaSymbol("hsFXUSD-ETH")).toBeNull();
  });

  it("resolves ha token USD from peg target", () => {
    expect(resolveHaTokenUsdPrice("haETH", "ETH", pegPrices)).toBe(3000);
    expect(resolveHaTokenUsdPrice("haBTC", null, pegPrices)).toBe(60000);
    expect(resolveHaTokenUsdPrice("hsSTETH-BTC", "BTC", pegPrices)).toBeNull();
  });

  it("resolves primary reward token prices", () => {
    expect(
      resolveRewardTokenUsdPrice("fxSAVE", {
        fxSAVEPrice: 1.05,
        wstETHPrice: 3500,
      }),
    ).toBe(1.05);
    expect(
      resolveRewardTokenUsdPrice("wstETH", {
        fxSAVEPrice: 1.05,
        wstETHPrice: 3500,
      }),
    ).toBe(3500);
    expect(isPrimaryRewardTokenSymbol("fxSAVE")).toBe(true);
    expect(isPrimaryRewardTokenSymbol("USDC")).toBe(false);
  });

  it("builds suggested price maps for ha deposit and primary rewards", () => {
    const haEth = "0x1111111111111111111111111111111111111111";
    const fxSave = "0x2222222222222222222222222222222222222222";
    const usdc = "0x3333333333333333333333333333333333333333";

    const { suggestedDepositPrices, suggestedRewardPrices } =
      buildSuggestedAdminTokenPrices({
        depositTokenAddresses: [haEth],
        rewardTokenAddresses: [fxSave, usdc],
        tokenSymbolByAddress: {
          [haEth]: "haETH",
          [fxSave]: "fxSAVE",
          [usdc]: "USDC",
        },
        peggedTokenAddressMap: { [haEth]: "ETH" },
        pegPrices,
        cgPrices: { fxSAVEPrice: 1.05, wstETHPrice: 3500 },
      });

    expect(suggestedDepositPrices[haEth]).toBe("3000.00");
    expect(suggestedRewardPrices[fxSave]).toBe("1.050000");
    expect(suggestedRewardPrices[usdc]).toBeUndefined();
  });

  it("formats admin USD prices", () => {
    expect(formatAdminPriceUsd(3000.456)).toBe("3000.46");
    expect(formatAdminRewardPriceUsd(1.0945350483889254)).toBe(
      "1.094535",
    );
    expect(formatAdminPriceUsd(null)).toBe("");
  });
});
