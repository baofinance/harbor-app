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
  /**
   * When true, show a square “TEST” label in the Status column instead of time / state text.
   */
  test?: boolean;
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
  /**
   * When set (>0), early-depositor Genesis cap UI uses this many **collateral token** units
   * (with indexer progress), instead of the maiden-voyage USD cap from the indexer alone.
   */
  genesisTokenCapAmount?: number;
};
