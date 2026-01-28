import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";

interface UseWrappedCollateralPriceOptions {
  isOpen: boolean;
  collateralSymbol: string;
  coinGeckoId?: string;
  priceOracle?: `0x${string}`;
}

export const useWrappedCollateralPrice = ({
  isOpen,
  collateralSymbol,
  coinGeckoId,
  priceOracle,
}: UseWrappedCollateralPriceOptions) => {
  const { price: coinGeckoPrice, isLoading: isCoinGeckoLoading } =
    useCoinGeckoPrice(coinGeckoId || "", 60000);

  const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
  const shouldFetchStEthPrice = isWstETH;
  const { price: stEthCoinGeckoPrice } = useCoinGeckoPrice(
    shouldFetchStEthPrice ? "lido-staked-ethereum-steth" : "",
    60000
  );

  const oraclePriceData = useCollateralPrice(priceOracle, {
    enabled: isOpen && !!priceOracle,
  });

  const underlyingPriceUSD = coinGeckoPrice
    ? coinGeckoPrice
    : collateralSymbol.toLowerCase() === "fxusd" ||
      collateralSymbol.toLowerCase() === "fxsave"
    ? 1.0
    : oraclePriceData.priceUSD;

  const wrappedRate = oraclePriceData.maxRate;

  const coinGeckoIsWrappedToken =
    !!coinGeckoId &&
    ((coinGeckoId.toLowerCase() === "wrapped-steth" &&
      collateralSymbol.toLowerCase() === "wsteth") ||
      ((coinGeckoId.toLowerCase() === "fxsave" ||
        coinGeckoId.toLowerCase() === "fx-usd-saving") &&
        collateralSymbol.toLowerCase() === "fxsave"));

  const wrappedTokenPriceUSD = (() => {
    if (coinGeckoIsWrappedToken && coinGeckoPrice != null) {
      return coinGeckoPrice;
    }

    if (isWstETH && stEthCoinGeckoPrice != null && wrappedRate && wrappedRate > 0n) {
      return stEthCoinGeckoPrice * (Number(wrappedRate) / 1e18);
    }

    if (coinGeckoPrice != null && !coinGeckoIsWrappedToken && wrappedRate) {
      return coinGeckoPrice * (Number(wrappedRate) / 1e18);
    }

    if (coinGeckoPrice != null && !coinGeckoIsWrappedToken) {
      return coinGeckoPrice;
    }

    if (wrappedRate && underlyingPriceUSD > 0) {
      return underlyingPriceUSD * (Number(wrappedRate) / 1e18);
    }

    return underlyingPriceUSD;
  })();

  return {
    priceUSD: wrappedTokenPriceUSD,
    underlyingPriceUSD,
    wrappedRate,
    isCoinGeckoLoading,
    coinGeckoPrice,
    oraclePriceData,
  };
};
