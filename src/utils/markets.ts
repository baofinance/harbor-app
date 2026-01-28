export const getAcceptedDepositAssets = (
  market: any
): Array<{ symbol: string; name: string }> => {
  if (market?.acceptedAssets && Array.isArray(market.acceptedAssets)) {
    return market.acceptedAssets;
  }
  if (market?.collateral?.symbol) {
    return [
      {
        symbol: market.collateral.symbol,
        name: market.collateral.name || market.collateral.symbol,
      },
    ];
  }
  return [];
};
