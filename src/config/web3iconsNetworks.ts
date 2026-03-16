/**
 * Map chain display names (from market config) to @web3icons network ids.
 * Used so we can render optimized SVGs from @web3icons/core (networks: eth, monad, mega-eth, arbitrum, base, etc.).
 * @see https://web3icons.io / @web3icons/common metadata networks
 */
const CHAIN_NAME_TO_WEB3ICONS_ID: Record<string, string> = {
  Ethereum: "ethereum",
  ethereum: "ethereum",
  MegaETH: "mega-eth",
  "Mega ETH": "mega-eth",
  "mega-eth": "mega-eth",
  Arbitrum: "arbitrum-one",
  "Arbitrum One": "arbitrum-one",
  "arbitrum-one": "arbitrum-one",
  Base: "base",
  base: "base",
  Monad: "monad",
  monad: "monad",
};

/**
 * Returns the @web3icons network id for a given chain name (e.g. from market.chain.name), or undefined if not in the set.
 */
export function getWeb3iconsNetworkId(chainName: string): string | undefined {
  if (!chainName) return undefined;
  const id = CHAIN_NAME_TO_WEB3ICONS_ID[chainName];
  if (id) return id;
  const normalized = chainName.trim();
  return CHAIN_NAME_TO_WEB3ICONS_ID[normalized];
}
