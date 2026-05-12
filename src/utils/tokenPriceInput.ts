export type TokenPriceInput = {
  marketId: string;
  minterAddress: `0x${string}`;
  pegTarget: string;
  chainId?: number;
};

export function buildTokenPriceInput(params: {
  marketId: string;
  minterAddress?: string;
  pegTarget?: string;
  chainId?: number;
}): TokenPriceInput | null {
  const { marketId, minterAddress, pegTarget = "USD", chainId } = params;
  if (
    !minterAddress ||
    typeof minterAddress !== "string" ||
    !minterAddress.startsWith("0x") ||
    minterAddress.length !== 42
  ) {
    return null;
  }

  return {
    marketId,
    minterAddress: minterAddress as `0x${string}`,
    pegTarget,
    chainId,
  };
}
