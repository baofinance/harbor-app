/**
 * Narrow shape for Genesis index/detail row rendering (avoids `mkt as any` everywhere).
 * Markets in `config/markets` satisfy this for genesis entries; use when typing row props.
 */
export type GenesisMarketConfig = {
  name?: string;
  pegTarget?: string;
  status?: string;
  rowLeveragedSymbol?: string;
  coinGeckoId?: string;
  maintenance?: boolean;
  /** Chain id when present on market config (e.g. multi-chain rows). */
  chainId?: number;
  collateral?: {
    symbol?: string;
    underlyingSymbol?: string;
    name?: string;
  };
  peggedToken?: { symbol?: string; name?: string; description?: string };
  leveragedToken?: { symbol?: string; name?: string; description?: string };
  addresses?: {
    genesis?: string;
    minter?: `0x${string}`;
    wrappedCollateralToken?: `0x${string}`;
    collateralPrice?: `0x${string}`;
  };
  chain?: { name?: string; logo?: string };
  genesis?: { endDate?: string; startDate?: string };
  marksCampaign?: { id?: string; label?: string };
};
