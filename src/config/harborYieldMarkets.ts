import type { PegAssetKey } from "@/utils/sailMarketChartSeries";

export type HarborYieldMarketId = "hyeth" | "hyusd";

export type HarborYieldMarket = {
  id: HarborYieldMarketId;
  symbol: "hyETH" | "hyUSD";
  name: string;
  pegSymbol: "ETH" | "USD";
  haSymbol: "haETH" | "haUSD";
  /** Chainlink series for the peg the ha token tracks. */
  asset: Extract<PegAssetKey, "ETH" | "USD">;
  /**
   * Peg units per 1 hy share. 1 until a vault is live, so hy USD equals ha USD.
   * Raise this when convertToAssets is available.
   */
  sharePriceInPeg: number;
  icon: string;
  pegIcon: string;
};

export const HARBOR_YIELD_MARKETS: readonly HarborYieldMarket[] = [
  {
    id: "hyeth",
    symbol: "hyETH",
    name: "Harbor Yield ETH",
    pegSymbol: "ETH",
    haSymbol: "haETH",
    asset: "ETH",
    sharePriceInPeg: 1,
    icon: "/icons/haETH.png",
    pegIcon: "/icons/eth.png",
  },
  {
    id: "hyusd",
    symbol: "hyUSD",
    name: "Harbor Yield USD",
    pegSymbol: "USD",
    haSymbol: "haUSD",
    asset: "USD",
    sharePriceInPeg: 1,
    icon: "/icons/haUSD_1.png",
    pegIcon: "/icons/usd.svg",
  },
];

export function harborYieldMarketById(
  id: string | null | undefined,
): HarborYieldMarket {
  return (
    HARBOR_YIELD_MARKETS.find((market) => market.id === id) ??
    HARBOR_YIELD_MARKETS[0]
  );
}
