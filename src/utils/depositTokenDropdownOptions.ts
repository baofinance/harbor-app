/** Token row passed to `TokenSelectorDropdown` option groups. */
export type DepositTokenDropdownToken = {
  symbol: string;
  name: string;
  isUserToken?: boolean;
};

/** Grouped token selector section (Supported Assets / via Swap). */
export type DepositTokenDropdownGroup = {
  label: string;
  tokens: DepositTokenDropdownToken[];
};

export type BuildDepositTokenDropdownGroupsParams = {
  supportedAssets: ReadonlyArray<{ symbol: string; name: string }>;
  swapAssets?: ReadonlyArray<{
    symbol: string;
    name: string;
    isUserToken?: boolean;
  }>;
  collateralOnly: boolean;
  isMegaEth: boolean;
  nativeTokenLabel: string;
};

/** Shared Supported Assets + Other Tokens (via Swap) groups for deposit modals. */
export function buildDepositTokenDropdownGroups({
  supportedAssets,
  swapAssets = [],
  collateralOnly,
  isMegaEth,
  nativeTokenLabel,
}: BuildDepositTokenDropdownGroupsParams): DepositTokenDropdownGroup[] {
  const groups: DepositTokenDropdownGroup[] = [];

  if (supportedAssets.length > 0) {
    groups.push({
      label: collateralOnly
        ? isMegaEth
          ? "Collateral (MegaETH)"
          : "Collateral"
        : "Supported Assets",
      tokens: supportedAssets.map((asset) => ({
        symbol: asset.symbol,
        name:
          isMegaEth && asset.symbol?.toUpperCase() === "ETH"
            ? nativeTokenLabel
            : asset.name,
      })),
    });
  }

  if (!collateralOnly && swapAssets.length > 0) {
    groups.push({
      label: "Other Tokens (via Swap)",
      tokens: swapAssets.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        isUserToken: token.isUserToken ?? true,
      })),
    });
  }

  return groups;
}

/** Wallet tokens eligible for ParaSwap, excluding market accepted assets. */
export function filterUserSwapTokens<T extends { symbol: string }>(
  userTokens: readonly T[],
  acceptedAssets: ReadonlyArray<{ symbol: string }>,
): T[] {
  const acceptedUpper = new Set(
    acceptedAssets.map((asset) => asset.symbol.toUpperCase()),
  );
  return userTokens.filter(
    (token) => !acceptedUpper.has(token.symbol.toUpperCase()),
  );
}
