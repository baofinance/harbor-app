import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useCollateralPrice } from "@/hooks/useCollateralPrice";
import {
  computeWrappedCollateralPriceUsdCore,
  deriveUnderlyingPriceUSDFromHookInputs,
} from "@/utils/wrappedCollateralPriceUSD";

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

  const underlyingPriceUSD = deriveUnderlyingPriceUSDFromHookInputs({
    collateralSymbol,
    coinGeckoPrice,
    oraclePriceUSD: oraclePriceData.priceUSD,
  });

  const wrappedRate = oraclePriceData.maxRate;

  const wrappedTokenPriceUSD = computeWrappedCollateralPriceUsdCore({
    underlyingPriceUSD,
    collateralSymbol,
    coinGeckoId,
    coinGeckoPrice,
    stEthCoinGeckoPrice,
    wrappedRate,
  });

  return {
    priceUSD: wrappedTokenPriceUSD,
    underlyingPriceUSD,
    wrappedRate,
    isCoinGeckoLoading,
    coinGeckoPrice,
    oraclePriceData,
  };
};
